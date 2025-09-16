
// OpenAI API service for AI project generation
import { debounce } from 'lodash';

class OpenAIService {
  constructor() {
    this.apiKey = process.env.REACT_APP_OPENAI_API_KEY;
    this.baseURL = 'https://api.openai.com/v1';
    this.model = 'gpt-4o-mini'; // More cost-effective than gpt-4
    
    // Rate limiting
    this.requestCount = 0;
    this.lastRequestTime = 0;
    this.maxRequestsPerMinute = 10;
    
    // Debounced function for auto-generation
    this.debouncedGenerate = debounce(this.generateProjectSuggestions.bind(this), 2500);
    
    // Check if API key is configured
    if (!this.apiKey || this.apiKey === 'demo-key') {
      console.warn('⚠️ OpenAI API key not configured. Add REACT_APP_OPENAI_API_KEY to your .env file');
    }
  }

  // Check if real API is available
  isRealAPIAvailable() {
    return this.apiKey && this.apiKey !== 'demo-key' && this.apiKey.startsWith('sk-');
  }

  // Check rate limits
  checkRateLimit() {
    const now = Date.now();
    const timeDiff = now - this.lastRequestTime;
    
    if (timeDiff > 60000) {
      // Reset counter every minute
      this.requestCount = 0;
    }
    
    if (this.requestCount >= this.maxRequestsPerMinute) {
      throw new Error('Rate limit exceeded. Please wait a moment before trying again.');
    }
    
    this.requestCount++;
    this.lastRequestTime = now;
  }

  // Generate project suggestions based on project name and type
  async generateProjectSuggestions(projectName, projectType = 'general', teamSize = 5, teamExperience = 'intermediate') {
    try {
      this.checkRateLimit();

      // Use real API if available, fallback to mock
      if (this.isRealAPIAvailable()) {
        return await this.callRealOpenAIAPI(projectName, projectType, teamSize, teamExperience);
      } else {
        console.warn('🤖 Using mock data - configure REACT_APP_OPENAI_API_KEY for real AI suggestions');
        return this.getMockProjectSuggestions(projectName, projectType, teamSize, teamExperience);
      }
    } catch (error) {
      console.error('OpenAI API error:', error);
      
      // Fallback to mock data on API failure
      if (error.message.includes('rate limit') || error.message.includes('quota')) {
        throw error; // Re-throw rate limit errors
      }
      
      console.warn('🔄 API failed, falling back to mock data');
      return this.getMockProjectSuggestions(projectName, projectType, teamSize, teamExperience);
    }
  }

  // Real OpenAI API implementation
  async callRealOpenAIAPI(projectName, projectType, teamSize, teamExperience) {
    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt()
          },
          {
            role: 'user',
            content: this.getUserPrompt(projectName, projectType, teamSize, teamExperience)
          }
        ],
        temperature: 0.7,
        max_tokens: 2500,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || `HTTP ${response.status}`;
      
      if (response.status === 429) {
        throw new Error('OpenAI API rate limit exceeded. Please try again later.');
      } else if (response.status === 401) {
        throw new Error('Invalid OpenAI API key. Please check your configuration.');
      } else if (response.status === 402) {
        throw new Error('OpenAI API quota exceeded. Please check your billing.');
      } else {
        throw new Error(`OpenAI API error: ${errorMessage}`);
      }
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response format from OpenAI API');
    }
    
    const content = data.choices[0].message.content;
    console.log('✅ Received AI response:', content.substring(0, 200) + '...');
    
    return this.parseAIResponse(content);
  }

  // System prompt for OpenAI
  getSystemPrompt() {
    return `You are an expert project manager and software architect. Generate comprehensive, realistic project plans.

    You must respond with a valid JSON object containing exactly these fields:
    {
      "description": "Detailed 2-3 sentence project description and objectives",
      "recommendedType": "most appropriate project type from the given options",
      "recommendedTeamSize": number (2-15),
      "recommendedExperience": "junior|intermediate|senior|expert",
      "estimatedDuration": number (in days, be realistic: 14-180),
      "estimatedTasks": number (realistic task count: 10-100),
      "phases": ["Phase 1", "Phase 2", "Phase 3", "Phase 4", "Phase 5"],
      "technologies": ["Tech1", "Tech2", "Tech3", "Tech4", "Tech5"],
      "tasks": [
        {
          "phase": "exact phase name from phases array",
          "title": "Specific task title (max 50 chars)",
          "description": "Detailed task description (100-200 chars)",
          "priority": "high|medium|low",
          "estimatedHours": number (realistic: 2-40),
          "dependencies": ["Optional task title if dependent"]
        }
      ],
      "risks": ["Risk 1", "Risk 2", "Risk 3"],
      "teamRecommendations": ["Recommendation 1", "Recommendation 2", "Recommendation 3"]
    }

    Provide 8-15 specific, actionable tasks. Be realistic with time estimates. Focus on practical implementation steps.`;
  }

  // User prompt for OpenAI
  getUserPrompt(projectName, projectType, teamSize, teamExperience) {
    return `Generate a comprehensive project plan for:
    
    Project Name: "${projectName}"
    Project Type: ${projectType}
    Team Size: ${teamSize} people
    Team Experience Level: ${teamExperience}
    
    Create realistic phases, specific tasks with time estimates, technology recommendations, and risk assessment. 
    Tailor the complexity and timeline to the team's experience level.
    
    Make sure all tasks have realistic hour estimates and clear descriptions.`;
  }

  // Parse AI response
  parseAIResponse(content) {
    try {
      // Remove any markdown formatting and extra whitespace
      let cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
      
      // Handle cases where the AI might wrap the JSON
      if (!cleanContent.startsWith('{')) {
        const jsonStart = cleanContent.indexOf('{');
        const jsonEnd = cleanContent.lastIndexOf('}') + 1;
        if (jsonStart >= 0 && jsonEnd > jsonStart) {
          cleanContent = cleanContent.substring(jsonStart, jsonEnd);
        }
      }
      
      const parsed = JSON.parse(cleanContent);
      
      // Validate required fields
      const required = ['description', 'phases', 'technologies', 'tasks', 'risks'];
      for (const field of required) {
        if (!parsed[field]) {
          throw new Error(`Missing required field: ${field}`);
        }
      }
      
      // Ensure tasks is an array
      if (!Array.isArray(parsed.tasks)) {
        throw new Error('Tasks must be an array');
      }
      
      // Add type information for consistency with mock data
      parsed.type = this.getTypeInfo(parsed.recommendedType || 'general');
      
      console.log('✅ Successfully parsed AI response');
      return parsed;
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      console.error('Raw content:', content);
      throw new Error('Failed to parse AI response. The AI returned invalid JSON.');
    }
  }

  // Get type information for consistency
  getTypeInfo(projectType) {
    const typeMap = {
      general: { icon: 'Folder', label: 'General Project', color: 'bg-gray-500' },
      web_application: { icon: 'Globe', label: 'Web Application', color: 'bg-blue-500' },
      mobile_app: { icon: 'Smartphone', label: 'Mobile App', color: 'bg-green-500' },
      ecommerce_platform: { icon: 'ShoppingCart', label: 'E-commerce Platform', color: 'bg-purple-500' },
      saas_application: { icon: 'Cloud', label: 'SaaS Application', color: 'bg-indigo-500' },
      devops_infrastructure: { icon: 'Server', label: 'DevOps/Infrastructure', color: 'bg-orange-500' }
    };
    return typeMap[projectType] || typeMap.general;
  }

  // Mock data for demo purposes (fallback)
  getMockProjectSuggestions(projectName, projectType, teamSize, teamExperience) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockData = this.generateMockData(projectName, projectType, teamSize, teamExperience);
        resolve(mockData);
      }, 1500 + Math.random() * 1000);
    });
  }

  generateMockData(projectName, projectType, teamSize, teamExperience) {
    const typeData = this.getProjectTypeData(projectType);
    const experienceMultiplier = this.getExperienceMultiplier(teamExperience);
    
    const baseDuration = typeData.baseDuration * experienceMultiplier;
    const baseTasks = Math.ceil(typeData.baseTasks * (teamSize / 5));

    return {
      name: projectName,
      description: `${projectName} is a comprehensive ${typeData.label.toLowerCase()} designed to ${typeData.objective}. This project will leverage modern development practices and cutting-edge technologies to deliver a scalable, maintainable solution.`,
      recommendedType: projectType,
      recommendedTeamSize: Math.min(Math.max(teamSize, typeData.minTeam), typeData.maxTeam),
      recommendedExperience: teamExperience,
      estimatedDuration: Math.ceil(baseDuration),
      estimatedTasks: baseTasks,
      phases: typeData.phases,
      technologies: typeData.technologies,
      tasks: this.generateTasks(typeData.phases, projectType, teamExperience),
      risks: typeData.risks,
      teamRecommendations: typeData.teamRecommendations,
      type: {
        icon: typeData.icon,
        label: typeData.label,
        color: typeData.color
      }
    };
  }

  getProjectTypeData(projectType) {
    const typeMap = {
      general: {
        label: 'General Project',
        objective: 'deliver a flexible solution with customizable workflow',
        baseDuration: 30,
        baseTasks: 25,
        minTeam: 2,
        maxTeam: 8,
        icon: 'Folder',
        color: 'bg-gray-500',
        phases: ['Planning & Analysis', 'Design & Architecture', 'Development', 'Testing & QA', 'Deployment & Launch'],
        technologies: ['React', 'Node.js', 'PostgreSQL', 'Docker', 'AWS'],
        risks: ['Scope creep due to flexible requirements', 'Resource allocation challenges', 'Timeline estimation difficulties'],
        teamRecommendations: ['Assign dedicated project manager', 'Establish clear communication protocols', 'Implement agile methodology']
      },
      web_application: {
        label: 'Web Application',
        objective: 'create a robust, scalable web platform with modern user experience',
        baseDuration: 45,
        baseTasks: 35,
        minTeam: 3,
        maxTeam: 10,
        icon: 'Globe',
        color: 'bg-blue-500',
        phases: ['Requirements Gathering', 'UI/UX Design', 'Frontend Development', 'Backend Development', 'Integration & Testing', 'Deployment'],
        technologies: ['React', 'TypeScript', 'Node.js', 'Express', 'MongoDB', 'Redis', 'AWS/Azure'],
        risks: ['Browser compatibility issues', 'Performance bottlenecks', 'Security vulnerabilities', 'Third-party API dependencies'],
        teamRecommendations: ['Include dedicated UI/UX designer', 'Implement automated testing early', 'Plan for scalability from start']
      },
      mobile_app: {
        label: 'Mobile App',
        objective: 'develop a native or cross-platform mobile application',
        baseDuration: 60,
        baseTasks: 40,
        minTeam: 3,
        maxTeam: 8,
        icon: 'Smartphone',
        color: 'bg-green-500',
        phases: ['Market Research', 'App Design', 'Development', 'Testing on Devices', 'App Store Submission', 'Launch & Marketing'],
        technologies: ['React Native', 'Flutter', 'Firebase', 'Redux', 'Push Notifications', 'Analytics'],
        risks: ['App store approval delays', 'Device fragmentation', 'Performance on older devices', 'Platform-specific issues'],
        teamRecommendations: ['Include mobile UX specialist', 'Test on multiple devices early', 'Plan app store optimization strategy']
      },
      ecommerce_platform: {
        label: 'E-commerce Platform',
        objective: 'build a comprehensive online marketplace with secure payments',
        baseDuration: 75,
        baseTasks: 50,
        minTeam: 5,
        maxTeam: 12,
        icon: 'ShoppingCart',
        color: 'bg-purple-500',
        phases: ['Market Analysis', 'Platform Architecture', 'Core Development', 'Payment Integration', 'Security Implementation', 'Launch & Optimization'],
        technologies: ['React', 'Node.js', 'Stripe/PayPal', 'PostgreSQL', 'Redis', 'Elasticsearch', 'CDN'],
        risks: ['Payment security compliance', 'High traffic handling', 'Inventory management complexity', 'Multi-vendor coordination'],
        teamRecommendations: ['Include security specialist', 'Implement robust testing for payments', 'Plan for peak traffic scenarios']
      },
      saas_application: {
        label: 'SaaS Application',
        objective: 'create a multi-tenant cloud-based software solution',
        baseDuration: 90,
        baseTasks: 60,
        minTeam: 6,
        maxTeam: 15,
        icon: 'Cloud',
        color: 'bg-indigo-500',
        phases: ['Product Strategy', 'Multi-tenant Architecture', 'Core Platform Development', 'Billing Integration', 'Analytics & Monitoring', 'Go-to-Market'],
        technologies: ['React', 'Node.js', 'PostgreSQL', 'Redis', 'Kubernetes', 'Stripe', 'Analytics', 'Monitoring'],
        risks: ['Multi-tenancy complexity', 'Data isolation challenges', 'Scalability requirements', 'Subscription billing complexity'],
        teamRecommendations: ['Include DevOps engineer', 'Plan comprehensive monitoring', 'Implement automated scaling']
      },
      devops_infrastructure: {
        label: 'DevOps/Infrastructure',
        objective: 'establish robust CI/CD pipelines and infrastructure automation',
        baseDuration: 40,
        baseTasks: 30,
        minTeam: 2,
        maxTeam: 6,
        icon: 'Server',
        color: 'bg-orange-500',
        phases: ['Infrastructure Assessment', 'CI/CD Pipeline Design', 'Automation Implementation', 'Monitoring Setup', 'Security Hardening', 'Documentation'],
        technologies: ['Docker', 'Kubernetes', 'Jenkins/GitHub Actions', 'Terraform', 'Prometheus', 'Grafana', 'AWS/Azure'],
        risks: ['Infrastructure downtime', 'Security misconfigurations', 'Automation complexity', 'Tool integration challenges'],
        teamRecommendations: ['Include security expert', 'Implement comprehensive monitoring', 'Plan disaster recovery procedures']
      }
    };

    return typeMap[projectType] || typeMap.general;
  }

  getExperienceMultiplier(experience) {
    const multipliers = {
      junior: 1.5,
      intermediate: 1.0,
      senior: 0.8,
      expert: 0.6
    };
    return multipliers[experience] || 1.0;
  }

  generateTasks(phases, projectType, teamExperience) {
    const tasks = [];
    const taskTemplates = this.getTaskTemplates(projectType);
    
    phases.forEach((phase, phaseIndex) => {
      const phaseTasks = taskTemplates[phaseIndex] || taskTemplates[0];
      phaseTasks.forEach(taskTemplate => {
        tasks.push({
          phase,
          title: taskTemplate.title,
          description: taskTemplate.description,
          priority: taskTemplate.priority,
          estimatedHours: this.adjustHoursForExperience(taskTemplate.estimatedHours, teamExperience),
          dependencies: taskTemplate.dependencies || []
        });
      });
    });

    return tasks;
  }

  getTaskTemplates(projectType) {
    return [
      [
        { title: 'Project Kickoff Meeting', description: 'Align team on project goals and timeline', priority: 'high', estimatedHours: 4 },
        { title: 'Requirements Analysis', description: 'Gather and document detailed requirements', priority: 'high', estimatedHours: 16 },
        { title: 'Technical Architecture Planning', description: 'Design system architecture and technology stack', priority: 'high', estimatedHours: 12 }
      ],
      [
        { title: 'UI/UX Design', description: 'Create user interface designs and user experience flows', priority: 'high', estimatedHours: 24 },
        { title: 'Database Schema Design', description: 'Design database structure and relationships', priority: 'high', estimatedHours: 8 },
        { title: 'API Design', description: 'Define API endpoints and data structures', priority: 'medium', estimatedHours: 12 }
      ],
      [
        { title: 'Core Feature Development', description: 'Implement main application features', priority: 'high', estimatedHours: 40 },
        { title: 'Authentication System', description: 'Implement user authentication and authorization', priority: 'high', estimatedHours: 16 },
        { title: 'Data Integration', description: 'Connect frontend with backend services', priority: 'medium', estimatedHours: 20 }
      ]
    ];
  }

  adjustHoursForExperience(baseHours, experience) {
    const multiplier = this.getExperienceMultiplier(experience);
    return Math.ceil(baseHours * multiplier);
  }

  // Debounced auto-generation trigger
  autoGenerateFromName(projectName, projectType, teamSize, teamExperience) {
    if (projectName && projectName.length > 3) {
      return this.debouncedGenerate(projectName, projectType, teamSize, teamExperience);
    }
    return Promise.resolve(null);
  }

  // Cancel pending auto-generation
  cancelAutoGeneration() {
    this.debouncedGenerate.cancel();
  }

  // Get API status for UI display
  getAPIStatus() {
    if (!this.apiKey) {
      return { status: 'not_configured', message: 'OpenAI API key not set' };
    } else if (this.apiKey === 'demo-key') {
      return { status: 'demo', message: 'Using demo mode' };
    } else if (!this.apiKey.startsWith('sk-')) {
      return { status: 'invalid', message: 'Invalid API key format' };
    } else {
      return { status: 'configured', message: 'OpenAI API ready' };
    }
  }
}

export default new OpenAIService();