'use client'

import { useRef, useState } from 'react'
import {
  BarChart3,
  ChevronRight,
  Database,
  FileText,
  Megaphone,
  NotebookPen,
  Plus,
  Search,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NavigationTabs } from './components/navigation-tabs'
import { TemplateCard } from './components/template-card'

// Mock data for templates
const mockTemplates = {
  your: [
    {
      id: '1',
      title: 'Meeting Notetaker',
      description: 'Auto-captures meeting highlights and action items no notes needed.',
      author: 'Emir Ayaz',
      usageCount: '9k',
      category: 'your',
      icon: NotebookPen,
      iconColor: 'bg-green-500',
      blocks: ['Mail Agent', 'Conditional 1', 'FetchInfo API'],
    },
  ],
  research: [
    {
      id: '2',
      title: 'Competitor Analyzer',
      description: 'Scans websites and content to generate competitive insights.',
      author: 'Sarah Chen',
      usageCount: '15k',
      category: 'research',
      icon: BarChart3,
      iconColor: 'bg-blue-500',
      blocks: ['Web Scraper', 'Data Processor', 'Report Generator'],
    },
    {
      id: '3',
      title: 'Literature Summarizer',
      description: 'Reads long papers or articles and delivers clear, structured summaries.',
      author: 'Michael Torres',
      usageCount: '11.8k',
      category: 'research',
      icon: FileText,
      iconColor: 'bg-indigo-500',
      blocks: ['PDF Reader', 'Text Analyzer', 'Summary Builder'],
    },
    {
      id: '4',
      title: 'Market Research Assistant',
      description: 'Analyzes market trends and consumer behavior from multiple data sources.',
      author: 'Jennifer Liu',
      usageCount: '8.2k',
      category: 'research',
      icon: BarChart3,
      iconColor: 'bg-teal-500',
      blocks: ['Data Collector', 'Trend Analyzer', 'Insight Generator'],
    },
    {
      id: '5',
      title: 'Survey Data Processor',
      description: 'Processes and analyzes survey responses with statistical insights.',
      author: 'David Park',
      usageCount: '5.7k',
      category: 'research',
      icon: Database,
      iconColor: 'bg-cyan-500',
      blocks: ['Survey Parser', 'Stats Calculator', 'Chart Builder'],
    },
  ],
  marketing: [
    {
      id: '6',
      title: 'Cold Outreach Sender',
      description: 'Sends personalized cold emails at scale, with smart follow-ups.',
      author: 'Liam Chen',
      usageCount: '15k',
      category: 'marketing',
      icon: Megaphone,
      iconColor: 'bg-purple-500',
      blocks: ['Email Generator', 'Contact Finder', 'Follow-up Scheduler'],
    },
    {
      id: '7',
      title: 'Campaign Scheduler',
      description: 'Plans, schedules, and launches multi-channel campaigns automatically.',
      author: 'Jade Monroe',
      usageCount: '11.8k',
      category: 'marketing',
      icon: Megaphone,
      iconColor: 'bg-pink-500',
      blocks: ['Campaign Planner', 'Schedule Manager', 'Launch Controller'],
    },
    {
      id: '8',
      title: 'Ad Copy Generator',
      description: 'Creates high-converting ad copy tailored to your target audience.',
      author: 'Carlos Mendez',
      usageCount: '14.2k',
      category: 'marketing',
      icon: FileText,
      iconColor: 'bg-orange-500',
      blocks: ['Copy Writer', 'A/B Tester', 'Performance Tracker'],
    },
    {
      id: '9',
      title: 'Performance Reporter',
      description: 'Generates weekly reports with insights and recommendations.',
      author: 'Emily Zhao',
      usageCount: '7.3k',
      category: 'marketing',
      icon: BarChart3,
      iconColor: 'bg-red-500',
      blocks: ['Data Collector', 'Report Builder', 'Insight Analyzer'],
    },
    {
      id: '10',
      title: 'Lead Qualifier',
      description: 'Scores and tags incoming leads using set criteria—fast and automatic.',
      author: 'Marcus Vega',
      usageCount: '13.2k',
      category: 'marketing',
      icon: Database,
      iconColor: 'bg-yellow-500',
      blocks: ['Lead Scorer', 'Tag Manager', 'CRM Sync'],
    },
    {
      id: '11',
      title: 'Social Media Scheduler',
      description: 'Automatically schedules and posts content across multiple platforms.',
      author: 'Rachel Kim',
      usageCount: '9.8k',
      category: 'marketing',
      icon: Megaphone,
      iconColor: 'bg-violet-500',
      blocks: ['Content Scheduler', 'Platform Manager', 'Analytics Tracker'],
    },
  ],
  data: [
    {
      id: '12',
      title: 'Data Pipeline Builder',
      description: 'Creates automated data processing workflows with transformations.',
      author: 'Alex Johnson',
      usageCount: '6.4k',
      category: 'data',
      icon: Database,
      iconColor: 'bg-emerald-500',
      blocks: ['Data Ingester', 'Transformer', 'Output Manager'],
    },
    {
      id: '13',
      title: 'Database Sync Manager',
      description: 'Keeps multiple databases synchronized with real-time updates.',
      author: 'Sofia Rodriguez',
      usageCount: '4.9k',
      category: 'data',
      icon: Database,
      iconColor: 'bg-slate-500',
      blocks: ['Sync Monitor', 'Update Handler', 'Conflict Resolver'],
    },
    {
      id: '14',
      title: 'Analytics Dashboard',
      description: 'Builds interactive dashboards from multiple data sources.',
      author: 'James Wilson',
      usageCount: '8.1k',
      category: 'data',
      icon: BarChart3,
      iconColor: 'bg-lime-500',
      blocks: ['Data Connector', 'Chart Builder', 'Dashboard Manager'],
    },
    {
      id: '15',
      title: 'Data Quality Checker',
      description: 'Automatically validates and cleans data for accuracy and completeness.',
      author: 'Maria Garcia',
      usageCount: '5.2k',
      category: 'data',
      icon: Database,
      iconColor: 'bg-rose-500',
      blocks: ['Validator', 'Cleaner', 'Quality Reporter'],
    },
  ],
}

const navigationTabs = [
  { id: 'your', label: 'Your templates', count: mockTemplates.your.length },
  { id: 'research', label: 'Research', count: mockTemplates.research.length },
  { id: 'marketing', label: 'Marketing', count: mockTemplates.marketing.length },
  { id: 'data', label: 'Data', count: mockTemplates.data.length },
]

export default function Templates() {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('your')

  // Refs for scrolling to sections
  const sectionRefs = {
    your: useRef<HTMLDivElement>(null),
    research: useRef<HTMLDivElement>(null),
    marketing: useRef<HTMLDivElement>(null),
    data: useRef<HTMLDivElement>(null),
  }

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId)
    const sectionRef = sectionRefs[tabId as keyof typeof sectionRefs]
    if (sectionRef.current) {
      sectionRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }
  }

  const handleTemplateClick = (templateId: string) => {
    // TODO: Navigate to template detail page
    console.log('Template clicked:', templateId)
  }

  const handleCreateNew = () => {
    // TODO: Open create template modal or navigate to create page
    console.log('Create new template')
  }

  const filteredTemplates = (category: keyof typeof mockTemplates) => {
    const templates = mockTemplates[category]
    if (!searchQuery) return templates

    return templates.filter(
      (template) =>
        template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.author.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }

  return (
    <div className='flex h-[100vh] flex-col pl-64'>
      <div className='flex flex-1 overflow-hidden'>
        <div className='flex flex-1 flex-col overflow-auto p-6'>
          {/* Header */}
          <div className='mb-6'>
            <h1 className='mb-2 font-sans font-semibold text-3xl text-foreground tracking-[0.01em]'>
              Templates
            </h1>
            <p className='font-[350] font-sans text-muted-foreground text-sm leading-[1.5] tracking-[0.01em]'>
              Grab a template and start building, or make
              <br />
              one from scratch.
            </p>
          </div>

          {/* Search and Create New */}
          <div className='mb-6 flex items-center justify-between'>
            <div className='flex h-9 w-[460px] items-center gap-2 rounded-lg border bg-transparent pr-2 pl-3'>
              <Search className='h-4 w-4 text-muted-foreground' strokeWidth={2} />
              <Input
                placeholder='Search templates...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className='flex-1 border-0 bg-transparent px-0 font-normal font-sans text-base text-foreground leading-none placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0'
              />
            </div>
            <Button
              onClick={handleCreateNew}
              className='flex h-9 items-center gap-2 rounded-lg bg-[#701FFC] px-4 py-2 font-normal font-sans text-sm text-white hover:bg-[#601EE0]'
            >
              <Plus className='h-4 w-4' />
              Create New
            </Button>
          </div>

          {/* Navigation */}
          <div className='mb-6'>
            <NavigationTabs
              tabs={navigationTabs}
              activeTab={activeTab}
              onTabClick={handleTabClick}
            />
          </div>

          {/* Your Templates Section */}
          <div ref={sectionRefs.your} className='mb-8'>
            <div className='mb-4 flex items-center gap-2'>
              <h2 className='font-medium font-sans text-foreground text-lg'>Your templates</h2>
              <ChevronRight className='h-4 w-4 text-muted-foreground' />
            </div>

            <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
              {filteredTemplates('your').map((template) => (
                <TemplateCard
                  key={template.id}
                  id={template.id}
                  title={template.title}
                  description={template.description}
                  author={template.author}
                  usageCount={template.usageCount}
                  icon={<template.icon />}
                  iconColor={template.iconColor}
                  blocks={template.blocks}
                  onClick={() => handleTemplateClick(template.id)}
                />
              ))}
            </div>
          </div>

          {/* Research Section */}
          <div ref={sectionRefs.research} className='mb-8'>
            <div className='mb-4 flex items-center gap-2'>
              <h2 className='font-medium font-sans text-foreground text-lg'>Research</h2>
              <ChevronRight className='h-4 w-4 text-muted-foreground' />
            </div>

            <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
              {filteredTemplates('research').map((template) => (
                <TemplateCard
                  key={template.id}
                  id={template.id}
                  title={template.title}
                  description={template.description}
                  author={template.author}
                  usageCount={template.usageCount}
                  icon={<template.icon />}
                  iconColor={template.iconColor}
                  blocks={template.blocks}
                  onClick={() => handleTemplateClick(template.id)}
                />
              ))}
            </div>
          </div>

          {/* Marketing Section */}
          <div ref={sectionRefs.marketing} className='mb-8'>
            <div className='mb-4 flex items-center gap-2'>
              <h2 className='font-medium font-sans text-foreground text-lg'>Marketing</h2>
              <ChevronRight className='h-4 w-4 text-muted-foreground' />
            </div>

            <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
              {filteredTemplates('marketing').map((template) => (
                <TemplateCard
                  key={template.id}
                  id={template.id}
                  title={template.title}
                  description={template.description}
                  author={template.author}
                  usageCount={template.usageCount}
                  icon={<template.icon />}
                  iconColor={template.iconColor}
                  blocks={template.blocks}
                  onClick={() => handleTemplateClick(template.id)}
                />
              ))}
            </div>
          </div>

          {/* Data Section */}
          <div ref={sectionRefs.data} className='mb-8'>
            <div className='mb-4 flex items-center gap-2'>
              <h2 className='font-medium font-sans text-foreground text-lg'>Data</h2>
              <ChevronRight className='h-4 w-4 text-muted-foreground' />
            </div>

            <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
              {filteredTemplates('data').map((template) => (
                <TemplateCard
                  key={template.id}
                  id={template.id}
                  title={template.title}
                  description={template.description}
                  author={template.author}
                  usageCount={template.usageCount}
                  icon={<template.icon />}
                  iconColor={template.iconColor}
                  blocks={template.blocks}
                  onClick={() => handleTemplateClick(template.id)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
