# Sim Studio YAML Workflow Reference for LLMs

A focused guide on YAML workflow syntax, common pitfalls, and essential examples.

## Basic Structure & Rules

Every workflow follows this structure:

```yaml
version: '1.0'
blocks:
  block-id:
    type: block-type
    name: "Block Name"
    inputs:
      key: value
    connections:
      success: next-block-id
```

**Critical Rules:**
- Version must be exactly `'1.0'` (with quotes)
- Every workflow needs exactly one `starter` block
- Use 2-space indentation consistently
- Block IDs can be anything, but block **names** are used for references

## Block Reference Syntax (IMPORTANT)

### How to Reference Blocks
To reference another block's output:
1. Take the block name: "Sum Calculator" 
2. Remove spaces, make lowercase: `sumcalculator`
3. Reference as: `<sumcalculator.property>`

```yaml
# Block definition
sum-agent:
  type: agent
  name: Sum Calculator

# Reference it elsewhere  
other-block:
  inputs:
    value: <sumcalculator.sum>    # Correct
    # NOT <sum-agent.sum> or <Sum Calculator.sum>
```

### Special Case: Starter Block
Always reference starter as `<start.input>` regardless of its name:

```yaml
start:
  type: starter
  name: "My Custom Start"

agent:
  inputs:
    userPrompt: <start.input>    # Always "start", never the actual name
```

### Environment Variables
Use double curly braces:

```yaml
apiKey: '{{ANTHROPIC_KEY}}'
```

## Essential Block Examples

### Starter Block
```yaml
start:
  type: starter
  name: Start
  inputs:
    startWorkflow: manual      # manual, webhook, or schedule
    scheduleType: daily
    weeklyDay: MON
    timezone: UTC
  connections:
    success: next-block
```

### Agent Block
```yaml
my-agent:
  type: agent
  name: Sum Calculator
  inputs:
    systemPrompt: "You are a helpful calculator. Return the sum of two numbers."
    userPrompt: <start.input>
    model: claude-sonnet-4-0
    temperature: 0.2
    apiKey: '{{ANTHROPIC_KEY}}'
    tools: []
    responseFormat: |
      {
        "name": "calculate_sum",
        "description": "Returns the sum",
        "strict": true,
        "schema": {
          "type": "object",
          "properties": {
            "sum": {"type": "integer"}
          },
          "required": ["sum"]
        }
      }
  connections:
    success: next-block
    error: error-handler
```

### Condition Block (Critical Syntax)
```yaml
my-condition:
  type: condition
  name: Check Value
  inputs:
    conditions:                  # Direct YAML object (NOT JSON string)
      if: <previousblock.score> > 10
      else-if: <previousblock.score> > 5
      else-if-2: <previousblock.score> > 0
  connections:
    conditions:
      if: high-score-block
      else-if: medium-score-block  
      else-if-2: low-score-block
      else: fallback-block       # Automatic else fallback
```

**Common Condition Mistakes:**
```yaml
# ❌ DON'T use JSON strings or |
conditions: |
  if: condition here

# ❌ DON'T use array format
conditions: |
  [{"title": "if", "value": "condition"}]

# ✅ DO use direct YAML object
conditions:
  if: condition here
  else-if: another condition
```

### Function Block
```yaml
my-function:
  type: function
  name: Process Data
  inputs:
    code: |
      const data = input.previousblock;
      return { 
        processed: true,
        result: data.value * 2 
      };
  connections:
    success: next-block
```

## Complete Workflow Examples

### Simple Linear Workflow
```yaml
version: '1.0'
blocks:
  start:
    type: starter
    name: Start
    inputs:
      startWorkflow: manual
    connections:
      success: sum-agent

  sum-agent:
    type: agent
    name: Sum Calculator
    inputs:
      systemPrompt: "The user will provide 2 numbers, return the sum."
      userPrompt: <start.input>
      model: claude-sonnet-4-0
      temperature: 0.2
      apiKey: '{{ANTHROPIC_KEY}}'
      tools: []
      responseFormat: |
        {
          "name": "calculate_sum",
          "description": "Returns a single integer called sum.",
          "strict": true,
          "schema": {
            "type": "object",
            "properties": {
              "sum": {"type": "integer"}
            },
            "required": ["sum"]
          }
        }
```

### Condition Workflow with Multiple Branches
```yaml
version: '1.0'
blocks:
  start:
    type: starter
    name: Start
    inputs:
      startWorkflow: manual
    connections:
      success: sum-agent

  sum-agent:
    type: agent
    name: Sum Calculator
    inputs:
      systemPrompt: "The user will provide 2 numbers, return the sum."
      userPrompt: <start.input>
      model: claude-sonnet-4-0
      temperature: 0.2
      apiKey: '{{ANTHROPIC_KEY}}'
      tools: []
      responseFormat: |
        {
          "name": "calculate_sum",
          "description": "Returns a single integer called sum.",
          "strict": true,
          "schema": {
            "type": "object",
            "properties": {
              "sum": {"type": "integer"}
            },
            "required": ["sum"]
          }
        }
    connections:
      success: sum-checker

  sum-checker:
    type: condition
    name: Check Sum Value
    inputs:
      conditions:
        if: <sumcalculator.sum> > 10
        else-if: <sumcalculator.sum> > 5
    connections:
      conditions:
        if: happy-greeting-agent
        else-if: neutral-greeting-agent
        else: sad-greeting-agent

  happy-greeting-agent:
    type: agent
    name: Happy Greeting
    inputs:
      systemPrompt: "Provide a happy, enthusiastic greeting. Be cheerful!"
      userPrompt: "The sum was <sumcalculator.sum>. Give me a happy greeting!"
      model: claude-sonnet-4-0
      temperature: 0.7
      apiKey: '{{ANTHROPIC_KEY}}'
      tools: []

  neutral-greeting-agent:
    type: agent
    name: Neutral Greeting
    inputs:
      systemPrompt: "Provide a neutral, polite greeting."
      userPrompt: "The sum was <sumcalculator.sum>. Give me a neutral greeting!"
      model: claude-sonnet-4-0
      temperature: 0.5
      apiKey: '{{ANTHROPIC_KEY}}'
      tools: []

  sad-greeting-agent:
    type: agent
    name: Sad Greeting
    inputs:
      systemPrompt: "Provide a sad, disappointed greeting."
      userPrompt: "The sum was <sumcalculator.sum>. Give me a sad greeting!"
      model: claude-sonnet-4-0
      temperature: 0.5
      apiKey: '{{ANTHROPIC_KEY}}'
      tools: []
```

### Complex Condition with Multiple Targets
```yaml
version: '1.0'
blocks:
  start:
    type: starter
    name: Start
    inputs:
      startWorkflow: manual
    connections:
      success: main-condition

  main-condition:
    type: condition
    name: Condition 1
    inputs:
      conditions:
        if: 1 == 2
        else-if: 6 == 7
        else-if-2: 9 == 10
    connections:
      conditions:
        if: function-1
        else-if:                    # Multiple targets for one condition
          - function-2
          - function-4
        else-if-2: function-3
        else: function-5

  function-1:
    type: function
    name: Function 1
    inputs:
      code: "return { message: 'Condition IF was true' };"

  function-2:
    type: function
    name: Function 2
    inputs:
      code: "return { message: 'Condition ELSE-IF was true - branch 1' };"

  function-3:
    type: function
    name: Function 3
    inputs:
      code: "return { message: 'Condition ELSE-IF-2 was true' };"

  function-4:
    type: function
    name: Function 4
    inputs:
      code: "return { message: 'Condition ELSE-IF was true - branch 2' };"

  function-5:
    type: function
    name: Function 5
    inputs:
      code: "return { message: 'All conditions failed, using ELSE' };"
```

## Key Syntax Reminders

1. **Block names** → references: "Sum Calculator" becomes `<sumcalculator.property>`
2. **Starter block** → always `<start.input>` 
3. **Conditions** → direct YAML object, not JSON string
4. **Environment variables** → `{{VARIABLE_NAME}}`
5. **Version** → must be `'1.0'` with quotes
6. **Indentation** → 2 spaces consistently

## Common Block Types
- `starter` - Always required, one per workflow
- `agent` - AI model interactions  
- `function` - Custom JavaScript code
- `condition` - Branching logic
- `api` - HTTP requests
- `loop` - Iteration over data
- `parallel` - Concurrent execution
- Tool blocks: `gmail`, `slack`, `notion`, etc.
