# Sim Studio YAML Workflow Reference

This document provides a comprehensive reference for writing workflows in YAML for Sim Studio.

## Basic Structure

Every workflow must follow this basic structure:

```yaml
version: '1.0'
blocks:
  block-id:
    type: block-type
    name: "Block Name"
    inputs:
      inputKey: value
    connections:
      success: target-block-id
```

## Required Components

### 1. Starter Block
Every workflow **must** have exactly one starter block to initiate execution:

```yaml
version: '1.0'
blocks:
  start-block-id:
    type: starter
    name: "Start"
    inputs:
      startWorkflow: manual  # manual, webhook, or schedule
      scheduleType: daily    # if startWorkflow is 'schedule'
      weeklyDay: MON        # if scheduleType is 'weekly'
      timezone: UTC
    connections:
      success: next-block-id
```

## Input Reference Syntax

### Block References
Reference outputs from other blocks using `<blockName.property>` or `<blockId.property>`:

```yaml
userPrompt: <start.input>           # Reference starter input
content: <apiCall.data.result>      # Reference API response data
message: <agentBlock.content>       # Reference agent output
```

### Environment Variables
Reference environment variables using `{{VARIABLE_NAME}}`:

```yaml
apiKey: '{{ANTHROPIC_KEY}}'         # Environment variable
url: 'https://api.example.com/{{API_VERSION}}'  # Mixed content
```

### Workflow Variables
Reference workflow variables using `<variable.name>`:

```yaml
userPrompt: <variable.customerData>
systemPrompt: <variable.instructions>
```

## Connection Types

### Basic Connections
```yaml
connections:
  success: next-block-id              # Single target
  success: [block1, block2]           # Multiple targets
  error: error-handler-block          # Error handling
```

### Conditional Connections
For condition blocks that branch based on logic:

```yaml
# Condition inputs (simple key-value format)
inputs:
  conditions:
    if: <previous-block.score> > 80        # First condition
    else-if: <previous-block.score> > 50   # Second condition  
    else-if-2: <previous-block.score> > 20 # Third condition
    else: true                             # Default fallback

# Condition connections (where to go for each result)
connections:
  conditions:
    if: high-score-block              # When first condition is true
    else-if: medium-score-block       # When second condition is true
    else-if-2: low-score-block        # When third condition is true
    else: failed-block                # When all conditions fail
```

### Container Connections

#### Loop Connections
```yaml
connections:
  loop:
    start: first-block-in-loop        # Entry point
    end: block-after-loop             # Exit point
```

#### Parallel Connections
```yaml
connections:
  parallel:
    start: [block1, block2, block3]   # Parallel execution branches
    end: convergence-block            # Where branches rejoin
```

## Complete Block Examples

### Full Starter Block
```yaml
start:
  type: starter
  name: "Start Workflow"
  inputs:
    startWorkflow: manual
    scheduleType: daily
    weeklyDay: MON
    timezone: UTC
  connections:
    success: check-score
```

### Full Agent Block
```yaml
sentiment-agent:
  type: agent
  name: "Sentiment Analyzer"
  inputs:
    systemPrompt: "Analyze the sentiment of the given text. Respond with POSITIVE, NEGATIVE, or NEUTRAL."
    userPrompt: "Please analyze this text: <start.input>"
    model: claude-sonnet-4-0
    temperature: 0.1
    apiKey: '{{ANTHROPIC_KEY}}'
    tools: []
    responseFormat: |
      {
        "name": "sentiment_analysis",
        "description": "Analyze sentiment of text",
        "strict": true,
        "schema": {
          "type": "object",
          "properties": {
            "sentiment": {
              "type": "string",
              "enum": ["POSITIVE", "NEGATIVE", "NEUTRAL"]
            },
            "confidence": {
              "type": "number",
              "description": "Confidence score between 0 and 1"
            }
          },
          "required": ["sentiment", "confidence"]
        }
      }
  connections:
    success: route-by-sentiment
    error: error-handler
```

### Full Condition Block
```yaml
score-checker:
  type: condition
  name: "Check Score Level"
  inputs:
    conditions:
      if: <previous-block.score> >= 90
      else-if: <previous-block.score> >= 70
      else-if-2: <previous-block.score> >= 50
      else: true
  connections:
    conditions:
      if: excellent-grade
      else-if: good-grade
      else-if-2: average-grade
      else: needs-improvement
```

### Full Function Block
```yaml
data-processor:
  type: function
  name: "Process User Data"
  inputs:
    code: |
      // Get the input data
      const userData = input.apiCall.data;
      const currentTime = new Date().toISOString();
      
      // Process each user
      const processedUsers = userData.users.map(user => {
        return {
          id: user.id,
          name: user.firstName + ' ' + user.lastName,
          email: user.email.toLowerCase(),
          isActive: user.lastLogin !== null,
          processedAt: currentTime,
          score: Math.random() * 100 // Example calculation
        };
      });
      
      // Return processed data
      return {
        users: processedUsers,
        totalCount: processedUsers.length,
        activeCount: processedUsers.filter(u => u.isActive).length,
        processedAt: currentTime
      };
  connections:
    success: send-notification
    error: log-error
```

### Full API Block
```yaml
weather-api:
  type: api
  name: "Get Weather Data"
  inputs:
    url: "https://api.openweathermap.org/data/2.5/weather"
    method: GET
    headers:
      Accept: application/json
    params:
      q: <start.input>
      appid: '{{WEATHER_API_KEY}}'
      units: metric
  connections:
    success: format-weather
    error: weather-error-handler
```

### Full Loop Block with Nested Blocks
```yaml
user-loop:
  type: loop
  name: "Process Each User"
  inputs:
    loopType: forEach
    collection: <api-call.data.users>
  connections:
    loop:
      start: validate-user
      end: summary-report

validate-user:
  type: function
  name: "Validate User Data"
  parentId: user-loop
  inputs:
    code: |
      const user = input.loop.item;
      const isValid = user.email && user.email.includes('@');
      return {
        userId: user.id,
        isValid: isValid,
        email: user.email,
        validationTime: new Date().toISOString()
      };
  connections:
    success: check-if-valid

check-if-valid:
  type: condition
  name: "Is User Valid?"
  parentId: user-loop
  inputs:
    conditions:
      if: <validate-user.isValid> === true
      else: true
  connections:
    conditions:
      if: send-welcome-email
      else: log-invalid-user

send-welcome-email:
  type: gmail
  name: "Send Welcome Email"
  parentId: user-loop
  inputs:
    operation: send
    to: <validate-user.email>
    subject: "Welcome to our platform!"
    body: "Hi there! Welcome to our platform."
    credential: gmail-oauth

log-invalid-user:
  type: function
  name: "Log Invalid User"
  parentId: user-loop
  inputs:
    code: |
      console.log('Invalid user:', input.validateUser.userId);
      return { logged: true };
```

### Full Parallel Block with Multiple Branches
```yaml
parallel-processing:
  type: parallel
  name: "Parallel Data Processing"
  connections:
    parallel:
      start: [email-branch, sms-branch, slack-branch]
      end: combine-results

email-branch:
  type: gmail
  name: "Send Email Notification"
  parentId: parallel-processing
  inputs:
    operation: send
    to: admin@company.com
    subject: "Processing Complete"
    body: "The data processing job has finished. Results: <start.input>"
    credential: gmail-oauth
  connections:
    success: email-success-log

email-success-log:
  type: function
  name: "Log Email Success"
  parentId: parallel-processing
  inputs:
    code: |
      return {
        channel: 'email',
        status: 'sent',
        timestamp: new Date().toISOString(),
        recipient: 'admin@company.com'
      };

sms-branch:
  type: twilio_sms
  name: "Send SMS Alert"
  parentId: parallel-processing
  inputs:
    to: "+1234567890"
    message: "Alert: Processing job completed"
    credential: twilio-creds
  connections:
    success: sms-success-log

sms-success-log:
  type: function
  name: "Log SMS Success"
  parentId: parallel-processing
  inputs:
    code: |
      return {
        channel: 'sms',
        status: 'sent',
        timestamp: new Date().toISOString(),
        recipient: '+1234567890'
      };

slack-branch:
  type: slack
  name: "Post to Slack"
  parentId: parallel-processing
  inputs:
    operation: send_message
    channel: "#alerts"
    message: "🎉 Processing job completed successfully!"
    credential: slack-oauth
  connections:
    success: slack-success-log

slack-success-log:
  type: function
  name: "Log Slack Success"
  parentId: parallel-processing
  inputs:
    code: |
      return {
        channel: 'slack',
        status: 'sent',
        timestamp: new Date().toISOString(),
        recipient: '#alerts'
      };

combine-results:
  type: function
  name: "Combine All Results"
  inputs:
    code: |
      const results = [
        input.emailSuccessLog,
        input.smsSuccessLog,
        input.slackSuccessLog
      ];
      
      return {
        totalNotifications: results.length,
        successfulSends: results.filter(r => r.status === 'sent').length,
        summary: 'All notifications processed',
        details: results
      };
```

### Tool Blocks (Examples)

#### Gmail Block
```yaml
gmail-id:
  type: gmail
  name: "Send Email"
  inputs:
    operation: send
    to: user@example.com
    subject: "Workflow Result"
    body: <agentBlock.content>
    credential: oauth-credential-id
```

#### Slack Block
```yaml
slack-id:
  type: slack
  name: "Post to Slack"
  inputs:
    operation: send_message
    channel: "#general"
    message: "Workflow completed: <agentBlock.summary>"
    credential: oauth-credential-id
```

## Container Blocks

### Loop Block
Create iterations over data or counts:

```yaml
loop-id:
  type: loop
  name: "Process Items"
  inputs:
    loopType: forEach              # forEach or for
    collection: <apiCall.data.items>  # Data to iterate over
  connections:
    loop:
      start: process-item-block    # First block in loop
      end: summary-block           # Block after loop

process-item-block:
  type: function
  name: "Process Item"
  parentId: loop-id               # Must specify parent for nested blocks
  inputs:
    code: |
      const currentItem = input.loop.item;
      return { processed: currentItem.value * 2 };
  connections:
    success: next-in-loop-block
```

### Parallel Block
Execute multiple branches simultaneously:

```yaml
parallel-id:
  type: parallel
  name: "Parallel Processing"
  connections:
    parallel:
      start: [branch1-block, branch2-block, branch3-block]
      end: merge-results-block

branch1-block:
  type: function
  name: "Branch 1"
  parentId: parallel-id           # Must specify parent for nested blocks
  inputs:
    code: "return { branch: 1, result: 'data from branch 1' };"

branch2-block:
  type: function
  name: "Branch 2"
  parentId: parallel-id
  inputs:
    code: "return { branch: 2, result: 'data from branch 2' };"
```

## Complete Workflow Examples

### Condition Workflow
```yaml
version: '1.0'
blocks:
  05230681-a366-4e63-bf7a-660d4930876f:
    type: starter
    name: Start
    inputs:
      startWorkflow: manual
      scheduleType: daily
      weeklyDay: MON
      timezone: UTC
    connections:
      success: 71caebe5-bd8a-46bd-85a4-0be7c84a6401
  
  71caebe5-bd8a-46bd-85a4-0be7c84a6401:
    type: condition
    name: Condition 1
    inputs:
      conditions:
        if: 1 == 2
        else-if: 6 == 7
        else-if-2: 9 == 10
        else: true
    connections:
      conditions:
        if: aebb6bf9-966b-418e-b1b0-757970763a28
        else-if:
          - d64a62bc-ff18-4cf9-ad72-02a2637f18f9
          - 44b48543-7613-407a-a5a7-b73ed9b14036
        else-if-2: 8818905f-fd36-497c-b861-ca9acb0ce1b9
        else: a2646546-c4ab-4621-a0c9-f495989aa056
  
  aebb6bf9-966b-418e-b1b0-757970763a28:
    type: function
    name: Function 1
    inputs:
      code: "return { message: 'Condition IF was true' };"
  
  d64a62bc-ff18-4cf9-ad72-02a2637f18f9:
    type: function
    name: Function 2
    inputs:
      code: "return { message: 'Condition ELSE-IF was true - branch 1' };"
  
  44b48543-7613-407a-a5a7-b73ed9b14036:
    type: function
    name: Function 4
    inputs:
      code: "return { message: 'Condition ELSE-IF was true - branch 2' };"
  
  8818905f-fd36-497c-b861-ca9acb0ce1b9:
    type: function
    name: Function 3
    inputs:
      code: "return { message: 'Condition ELSE-IF-2 was true' };"
  
  a2646546-c4ab-4621-a0c9-f495989aa056:
    type: function
    name: Function 5
    inputs:
      code: "return { message: 'All conditions failed, using ELSE' };"
```

### Simple Linear Workflow
```yaml
version: '1.0'
blocks:
  start:
    type: starter
    name: "Start"
    inputs:
      startWorkflow: manual
    connections:
      success: agent

  agent:
    type: agent
    name: "Sum Calculator"
    inputs:
      systemPrompt: "The user will provide 2 numbers, return the sum."
      userPrompt: <start.input>
      model: claude-sonnet-4-0
      temperature: 0.2
      apiKey: '{{ANTHROPIC_KEY}}'
      responseFormat: |
        {
          "name": "calculate_sum",
          "description": "Returns a single integer called sum.",
          "schema": {
            "type": "object",
            "properties": {
              "sum": {"type": "integer"}
            },
            "required": ["sum"]
          }
        }
```

### Loop Workflow
```yaml
version: '1.0'
blocks:
  start:
    type: starter
    name: "Start"
    inputs:
      startWorkflow: manual
    connections:
      success: loop

  loop:
    type: loop
    name: "Process Loop"
    connections:
      loop:
        start: process-function
        end: summary-function

  process-function:
    type: function
    name: "Process Item"
    parentId: loop
    inputs:
      code: |
        const item = input.loop.item;
        return { processed: item * 2 };
    connections:
      success: log-function

  log-function:
    type: function
    name: "Log Result"
    parentId: loop
    inputs:
      code: |
        console.log('Processed:', input.processFunction.processed);
        return { logged: true };

  summary-function:
    type: function
    name: "Summary"
    inputs:
      code: |
        return { message: 'Loop completed successfully' };
```

### Parallel Workflow
```yaml
version: '1.0'
blocks:
  start:
    type: starter
    name: "Start"
    inputs:
      startWorkflow: manual
    connections:
      success: parallel

  parallel:
    type: parallel
    name: "Parallel Processing"
    connections:
      parallel:
        start: [workflow-branch, memory-branch]
        end: knowledge

  workflow-branch:
    type: workflow
    name: "Sub Workflow"
    parentId: parallel
    inputs:
      workflowId: sub-workflow-id
    connections:
      success: function-in-parallel

  function-in-parallel:
    type: function
    name: "Process Workflow Result"
    parentId: parallel
    inputs:
      code: "return { workflowResult: input.workflowBranch.result };"

  memory-branch:
    type: memory
    name: "Memory Operation"
    parentId: parallel
    inputs:
      operation: add
      role: user

  knowledge:
    type: knowledge
    name: "Knowledge Search"
    inputs:
      operation: search
```

## Key Rules

1. **Every workflow must have exactly one starter block**
2. **Block IDs must be unique within a workflow**
3. **Container blocks (loop, parallel) require parentId on nested blocks**
4. **Connections reference target block IDs, not names**
5. **Environment variables use {{VARIABLE}} syntax**
6. **Block references use <blockName.property> syntax**
7. **Use meaningful, descriptive block names**
8. **Indent YAML consistently (2 spaces recommended)**

## Available Block Types

Core blocks: `starter`, `agent`, `function`, `condition`, `api`, `router`, `evaluator`, `response`, `workflow`

Tool blocks: `airtable`, `browser_use`, `clay`, `confluence`, `discord`, `elevenlabs`, `exa`, `firecrawl`, `file`, `github`, `gmail`, `google_calendar`, `google_docs`, `google_drive`, `google_search`, `google_sheets`, `huggingface`, `image_generator`, `jina`, `jira`, `knowledge`, `linear`, `linkup`, `mem0`, `memory`, `microsoft_excel`, `microsoft_teams`, `mistral_parse`, `notion`, `openai`, `outlook`, `perplexity`, `pinecone`, `reddit`, `s3`, `serper`, `slack`, `stagehand`, `stagehand_agent`, `supabase`, `tavily`, `telegram`, `thinking`, `translate`, `twilio_sms`, `typeform`, `vision`, `whatsapp`, `x`, `youtube`

Container blocks: `loop`, `parallel` 