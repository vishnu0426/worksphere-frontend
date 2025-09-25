import React, { useState, useEffect } from 'react';
import { useUserProfile } from '../../hooks/useUserProfile';
import RoleBasedHeader from '../../components/ui/RoleBasedHeader';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import Select from '../../components/ui/Select';
import Modal from '../../components/ui/Modal';
import realApiService from '../../utils/realApiService';

const HelpSupport = () => {
  const { userProfile, currentOrganization, loading: profileLoading } = useUserProfile();
  const [activeTab, setActiveTab] = useState('faq');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Support ticket modal state
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [ticketForm, setTicketForm] = useState({
    subject: '',
    category: 'general',
    priority: 'medium',
    description: ''
  });
  const [tickets, setTickets] = useState([]);
  
  // Contact form state
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  // FAQ data
  const faqData = [
    {
      category: 'Getting Started',
      questions: [
        {
          question: 'How do I create my first project?',
          answer: 'To create a project, navigate to the Dashboard and click the "Create Project" button. Fill in the project details including name, description, and team members. You can also use our AI-powered project creation for intelligent task breakdown.'
        },
        {
          question: 'How do I invite team members?',
          answer: 'Go to Team Members page and click "Invite Members". Enter email addresses and select appropriate roles (Owner, Admin, Member, or Viewer). Invited members will receive an email invitation to join your organization.'
        },
        {
          question: 'What are the different user roles?',
          answer: 'Owner: Full access to all features. Admin: Manage projects and members. Member: Create and manage assigned tasks. Viewer: Read-only access to projects and tasks.'
        }
      ]
    },
    {
      category: 'Project Management',
      questions: [
        {
          question: 'How do I track project progress?',
          answer: 'Use the Project Overview dashboard to monitor progress, view task completion rates, and track milestones. The Kanban board provides visual task management with drag-and-drop functionality.'
        },
        {
          question: 'Can I set project deadlines and reminders?',
          answer: 'Yes, set project and task deadlines in the project settings. The system will automatically send reminder notifications before deadlines approach.'
        },
        {
          question: 'How do I use the AI project creation feature?',
          answer: 'Click "Create AI Project" and provide project details. Our AI will generate a complete project structure with intelligent task breakdown, timeline estimation, and resource allocation suggestions.'
        }
      ]
    },
    {
      category: 'Notifications & Communication',
      questions: [
        {
          question: 'How do I manage notification preferences?',
          answer: 'Go to Profile Settings > Notifications to customize your notification preferences. You can enable/disable email notifications, in-app notifications, and set notification frequency.'
        },
        {
          question: 'How do real-time notifications work?',
          answer: 'Our system uses WebSocket technology for instant notifications. You\'ll receive real-time updates for task assignments, project changes, comments, and team activities.'
        }
      ]
    },
    {
      category: 'Account & Security',
      questions: [
        {
          question: 'How do I change my password?',
          answer: 'Go to Profile Settings > Security and click "Change Password". Enter your current password and new password. We recommend using a strong password with at least 8 characters.'
        },
        {
          question: 'How do I enable two-factor authentication?',
          answer: 'In Profile Settings > Security, enable 2FA by scanning the QR code with your authenticator app. This adds an extra layer of security to your account.'
        }
      ]
    }
  ];

  // Troubleshooting guides
  const troubleshootingGuides = [
    {
      title: 'Login Issues',
      icon: 'LogIn',
      steps: [
        'Verify your email address and password are correct',
        'Check if Caps Lock is enabled',
        'Try resetting your password using "Forgot Password"',
        'Clear your browser cache and cookies',
        'Try logging in from an incognito/private browser window'
      ]
    },
    {
      title: 'Notification Problems',
      icon: 'Bell',
      steps: [
        'Check your notification preferences in Profile Settings',
        'Verify your email address is confirmed',
        'Check your spam/junk folder for email notifications',
        'Ensure browser notifications are enabled',
        'Try refreshing the page or logging out and back in'
      ]
    },
    {
      title: 'Project Access Issues',
      icon: 'Lock',
      steps: [
        'Verify you have the correct role permissions',
        'Check if you\'re in the correct organization',
        'Contact your organization admin for access',
        'Ensure the project hasn\'t been archived',
        'Try switching organizations if you belong to multiple'
      ]
    },
    {
      title: 'Performance Issues',
      icon: 'Zap',
      steps: [
        'Check your internet connection speed',
        'Close unnecessary browser tabs',
        'Clear browser cache and reload the page',
        'Disable browser extensions temporarily',
        'Try using a different browser or device'
      ]
    }
  ];

  const ticketCategories = [
    { value: 'general', label: 'General Support' },
    { value: 'technical', label: 'Technical Issue' },
    { value: 'billing', label: 'Billing & Account' },
    { value: 'feature', label: 'Feature Request' },
    { value: 'bug', label: 'Bug Report' },
    { value: 'security', label: 'Security Concern' }
  ];

  const priorityOptions = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' }
  ];

  // Load support tickets
  useEffect(() => {
    loadSupportTickets();
  }, []);

  const loadSupportTickets = async () => {
    try {
      const response = await realApiService.support.getTickets();
      setTickets(response.data || []);
    } catch (error) {
      console.error('Failed to load support tickets:', error);
    }
  };

  const handleTicketSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const ticketData = {
        ...ticketForm,
        organization_id: currentOrganization?.id
      };

      await realApiService.support.createTicket(ticketData);
      setSuccessMessage('Support ticket created successfully! We\'ll get back to you soon.');
      setTicketForm({ subject: '', category: 'general', priority: 'medium', description: '' });
      setShowTicketModal(false);
      loadSupportTickets();
      
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (error) {
      setError('Failed to create support ticket. Please try again.');
      console.error('Ticket creation error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await realApiService.support.sendContactMessage(contactForm);
      setSuccessMessage('Message sent successfully! We\'ll respond within 24 hours.');
      setContactForm({ name: '', email: '', subject: '', message: '' });
      
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (error) {
      setError('Failed to send message. Please try again.');
      console.error('Contact form error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const tabs = [
    { id: 'faq', label: 'FAQ', icon: 'HelpCircle' },
    { id: 'contact', label: 'Contact Us', icon: 'Mail' },
    { id: 'tickets', label: 'Support Tickets', icon: 'Ticket' },
    { id: 'troubleshooting', label: 'Troubleshooting', icon: 'Tool' },
    { id: 'documentation', label: 'Documentation', icon: 'Book' }
  ];

  if (profileLoading) {
    return (
      <div className='p-8 text-center'>
        <div className='flex flex-col items-center justify-center space-y-4'>
          <Icon name='Loader2' size={32} className='animate-spin text-primary' />
          <div className='text-lg text-muted-foreground'>Loading help & support...</div>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20'>
      <RoleBasedHeader />

      <div className='container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12 max-w-7xl'>
        {/* Header Section */}
        <div className='mb-8 sm:mb-12'>
          <div className='text-center max-w-3xl mx-auto'>
            <div className='flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 mb-6'>
              <div className='w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-500 via-purple-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg'>
                <Icon name='HelpCircle' size={28} className='text-white sm:w-8 sm:h-8' />
              </div>
              <div className='text-center sm:text-left'>
                <h1 className='text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-2 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent'>
                  Help & Support
                </h1>
                <p className='text-base sm:text-lg text-muted-foreground leading-relaxed'>
                  Get help, find answers, and contact our support team
                </p>
              </div>
            </div>

            {/* Success/Error Messages */}
            {successMessage && (
              <div className='mb-6 p-4 sm:p-5 bg-green-50 border border-green-200 rounded-xl shadow-sm'>
                <div className='flex items-center justify-center gap-3'>
                  <Icon name='CheckCircle' size={20} className='text-green-600 flex-shrink-0' />
                  <span className='text-green-800 font-medium text-sm sm:text-base'>{successMessage}</span>
                </div>
              </div>
            )}

            {error && (
              <div className='mb-6 p-4 sm:p-5 bg-red-50 border border-red-200 rounded-xl shadow-sm'>
                <div className='flex items-center justify-center gap-3'>
                  <Icon name='AlertCircle' size={20} className='text-red-600 flex-shrink-0' />
                  <span className='text-red-800 font-medium text-sm sm:text-base'>{error}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className='mb-8 sm:mb-12'>
          <div className='bg-white rounded-xl shadow-sm border border-gray-200/60 overflow-hidden'>
            <nav className='flex flex-wrap sm:flex-nowrap'>
              {tabs.map((tab, index) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-2 sm:gap-3 py-4 sm:py-5 px-3 sm:px-6 font-medium text-xs sm:text-sm transition-all duration-200 relative ${
                    activeTab === tab.id
                      ? 'bg-primary text-white shadow-md'
                      : 'text-muted-foreground hover:text-foreground hover:bg-gray-50'
                  } ${index !== tabs.length - 1 ? 'border-r border-gray-200/60' : ''}`}
                >
                  <Icon name={tab.icon} size={16} className='flex-shrink-0' />
                  <span className='hidden sm:inline'>{tab.label}</span>
                  <span className='sm:hidden'>{tab.label.split(' ')[0]}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className='max-w-5xl mx-auto'>
          {activeTab === 'faq' && (
            <div className='space-y-8 sm:space-y-12'>
              <div className='text-center mb-8 sm:mb-12'>
                <h2 className='text-2xl sm:text-3xl font-bold mb-3 sm:mb-4 text-foreground'>Frequently Asked Questions</h2>
                <p className='text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed'>
                  Find quick answers to common questions about using Agno WorkSphere
                </p>
              </div>

              {faqData.map((category, categoryIndex) => (
                <div key={categoryIndex} className='bg-white rounded-2xl border border-gray-200/60 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden'>
                  <div className='bg-gradient-to-r from-gray-50 to-gray-100/50 px-6 sm:px-8 py-5 sm:py-6 border-b border-gray-200/60'>
                    <h3 className='text-xl sm:text-2xl font-bold text-foreground flex items-center gap-3'>
                      <div className='w-8 h-8 sm:w-10 sm:h-10 bg-primary/10 rounded-lg flex items-center justify-center'>
                        <Icon name='HelpCircle' size={18} className='text-primary sm:w-5 sm:h-5' />
                      </div>
                      {category.category}
                    </h3>
                  </div>
                  <div className='p-6 sm:p-8 space-y-4 sm:space-y-6'>
                    {category.questions.map((faq, faqIndex) => (
                      <details key={faqIndex} className='group border border-gray-200/60 rounded-xl overflow-hidden hover:border-primary/30 transition-colors duration-200'>
                        <summary className='flex items-center justify-between cursor-pointer p-4 sm:p-6 bg-gray-50/50 hover:bg-gray-100/50 transition-colors duration-200 list-none'>
                          <span className='font-semibold text-foreground text-sm sm:text-base pr-4 leading-relaxed'>{faq.question}</span>
                          <Icon name='ChevronDown' size={20} className='text-muted-foreground group-open:rotate-180 transition-transform duration-200 flex-shrink-0' />
                        </summary>
                        <div className='px-4 sm:px-6 pb-4 sm:pb-6 pt-2 bg-white'>
                          <div className='text-muted-foreground leading-relaxed text-sm sm:text-base'>
                            {faq.answer}
                          </div>
                        </div>
                      </details>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'contact' && (
            <div className='space-y-8 sm:space-y-12'>
              <div className='text-center mb-8 sm:mb-12'>
                <h2 className='text-2xl sm:text-3xl font-bold mb-3 sm:mb-4 text-foreground'>Contact Us</h2>
                <p className='text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed'>
                  Get in touch with our support team - we're here to help you succeed
                </p>
              </div>

              <div className='grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12'>
                {/* Contact Information */}
                <div className='bg-white rounded-2xl border border-gray-200/60 shadow-sm p-6 sm:p-8'>
                  <div className='flex items-center gap-3 mb-6'>
                    <div className='w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center'>
                      <Icon name='MessageCircle' size={20} className='text-primary' />
                    </div>
                    <h3 className='text-xl sm:text-2xl font-bold text-foreground'>Get in Touch</h3>
                  </div>

                  <div className='space-y-6'>
                    <div className='flex items-start gap-4 p-4 bg-blue-50/50 rounded-xl border border-blue-100/60'>
                      <div className='w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0'>
                        <Icon name='Mail' size={18} className='text-blue-600' />
                      </div>
                      <div className='flex-1'>
                        <div className='font-semibold text-foreground mb-1'>Email Support</div>
                        <div className='text-muted-foreground text-sm'>support@agnoworksphere.com</div>
                        <div className='text-xs text-blue-600 mt-1'>We typically respond within 2-4 hours</div>
                      </div>
                    </div>

                    <div className='flex items-start gap-4 p-4 bg-green-50/50 rounded-xl border border-green-100/60'>
                      <div className='w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0'>
                        <Icon name='Clock' size={18} className='text-green-600' />
                      </div>
                      <div className='flex-1'>
                        <div className='font-semibold text-foreground mb-1'>Response Time</div>
                        <div className='text-muted-foreground text-sm'>Within 24 hours for standard issues</div>
                        <div className='text-xs text-green-600 mt-1'>Priority support for urgent matters</div>
                      </div>
                    </div>

                    <div className='flex items-start gap-4 p-4 bg-purple-50/50 rounded-xl border border-purple-100/60'>
                      <div className='w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0'>
                        <Icon name='Globe' size={18} className='text-purple-600' />
                      </div>
                      <div className='flex-1'>
                        <div className='font-semibold text-foreground mb-1'>Support Hours</div>
                        <div className='text-muted-foreground text-sm'>24/7 for critical issues</div>
                        <div className='text-xs text-purple-600 mt-1'>Business hours: 9 AM - 6 PM EST</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contact Form */}
                <div className='bg-white rounded-2xl border border-gray-200/60 shadow-sm p-6 sm:p-8'>
                  <div className='flex items-center gap-3 mb-6'>
                    <div className='w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center'>
                      <Icon name='Send' size={20} className='text-primary' />
                    </div>
                    <h3 className='text-xl sm:text-2xl font-bold text-foreground'>Send us a Message</h3>
                  </div>

                  <form onSubmit={handleContactSubmit} className='space-y-6'>
                    <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                      <Input
                        label='Full Name'
                        type='text'
                        value={contactForm.name}
                        onChange={(e) => setContactForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder='Enter your full name'
                        className='rounded-lg border-gray-200 focus:border-primary focus:ring-primary/20'
                        required
                      />
                      <Input
                        label='Email Address'
                        type='email'
                        value={contactForm.email}
                        onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                        placeholder='your.email@example.com'
                        className='rounded-lg border-gray-200 focus:border-primary focus:ring-primary/20'
                        required
                      />
                    </div>

                    <Input
                      label='Subject'
                      type='text'
                      value={contactForm.subject}
                      onChange={(e) => setContactForm(prev => ({ ...prev, subject: e.target.value }))}
                      placeholder='Brief description of your inquiry'
                      className='rounded-lg border-gray-200 focus:border-primary focus:ring-primary/20'
                      required
                    />

                    <Textarea
                      label='Message'
                      value={contactForm.message}
                      onChange={(e) => setContactForm(prev => ({ ...prev, message: e.target.value }))}
                      placeholder='Please provide details about your question or issue...'
                      rows={5}
                      className='rounded-lg border-gray-200 focus:border-primary focus:ring-primary/20 resize-none'
                      required
                    />

                    <Button
                      type='submit'
                      disabled={isLoading}
                      iconName={isLoading ? 'Loader2' : 'Send'}
                      iconPosition='left'
                      className='w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-200'
                    >
                      {isLoading ? 'Sending Message...' : 'Send Message'}
                    </Button>

                    <p className='text-xs text-muted-foreground text-center'>
                      We'll get back to you as soon as possible. For urgent matters, please email us directly.
                    </p>
                  </form>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tickets' && (
            <div className='space-y-8 sm:space-y-12'>
              <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 sm:mb-12'>
                <div>
                  <h2 className='text-2xl sm:text-3xl font-bold mb-3 sm:mb-4 text-foreground'>Support Tickets</h2>
                  <p className='text-base sm:text-lg text-muted-foreground leading-relaxed'>
                    Track your support requests and their status
                  </p>
                </div>
                <Button
                  onClick={() => setShowTicketModal(true)}
                  iconName='Plus'
                  iconPosition='left'
                  className='bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white font-semibold px-6 py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-200'
                >
                  Create New Ticket
                </Button>
              </div>

              {/* Tickets List */}
              <div className='space-y-6'>
                {tickets.length === 0 ? (
                  <div className='text-center py-16 sm:py-20 bg-white rounded-2xl border border-gray-200/60 shadow-sm'>
                    <div className='w-20 h-20 sm:w-24 sm:h-24 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6'>
                      <Icon name='Ticket' size={32} className='text-gray-400 sm:w-10 sm:h-10' />
                    </div>
                    <h3 className='text-xl sm:text-2xl font-bold mb-3 text-foreground'>No Support Tickets</h3>
                    <p className='text-muted-foreground mb-8 max-w-md mx-auto leading-relaxed'>
                      You haven't created any support tickets yet. Create your first ticket to get help from our support team.
                    </p>
                    <Button
                      onClick={() => setShowTicketModal(true)}
                      iconName='Plus'
                      iconPosition='left'
                      className='bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white font-semibold px-8 py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-200'
                    >
                      Create Your First Ticket
                    </Button>
                  </div>
                ) : (
                  tickets.map((ticket) => (
                    <div key={ticket.id} className='bg-card rounded-lg border border-border p-6'>
                      <div className='flex items-start justify-between mb-4'>
                        <div>
                          <h3 className='text-lg font-semibold text-foreground'>{ticket.subject}</h3>
                          <p className='text-muted-foreground'>#{ticket.ticket_number}</p>
                        </div>
                        <div className='flex items-center gap-2'>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            ticket.status === 'open' ? 'bg-blue-100 text-blue-800' :
                            ticket.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                            ticket.status === 'resolved' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {ticket.status.replace('_', ' ').toUpperCase()}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            ticket.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                            ticket.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                            ticket.priority === 'medium' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {ticket.priority.toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <p className='text-muted-foreground mb-4'>{ticket.description}</p>
                      <div className='flex items-center justify-between text-sm text-muted-foreground'>
                        <span>Category: {ticket.category}</span>
                        <span>Created: {new Date(ticket.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'troubleshooting' && (
            <div className='space-y-8 sm:space-y-12'>
              <div className='text-center mb-8 sm:mb-12'>
                <h2 className='text-2xl sm:text-3xl font-bold mb-3 sm:mb-4 text-foreground'>Troubleshooting Guides</h2>
                <p className='text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed'>
                  Step-by-step solutions for common issues and problems
                </p>
              </div>

              <div className='grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8'>
                {troubleshootingGuides.map((guide, index) => (
                  <div key={index} className='bg-white rounded-2xl border border-gray-200/60 shadow-sm hover:shadow-md transition-shadow duration-200 p-6 sm:p-8'>
                    <div className='flex items-center gap-4 mb-6'>
                      <div className='w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl flex items-center justify-center'>
                        <Icon name={guide.icon} size={22} className='text-primary sm:w-6 sm:h-6' />
                      </div>
                      <h3 className='text-xl sm:text-2xl font-bold text-foreground'>{guide.title}</h3>
                    </div>

                    <ol className='space-y-4'>
                      {guide.steps.map((step, stepIndex) => (
                        <li key={stepIndex} className='flex items-start gap-4'>
                          <span className='flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-primary to-primary/80 text-white rounded-full flex items-center justify-center text-sm sm:text-base font-bold shadow-sm'>
                            {stepIndex + 1}
                          </span>
                          <span className='text-muted-foreground leading-relaxed text-sm sm:text-base pt-1'>{step}</span>
                        </li>
                      ))}
                    </ol>

                    <div className='mt-6 pt-6 border-t border-gray-200/60'>
                      <p className='text-xs text-muted-foreground text-center'>
                        Still having issues? <button className='text-primary hover:underline font-medium'>Contact our support team</button>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'documentation' && (
            <div className='space-y-8 sm:space-y-12'>
              <div className='text-center mb-8 sm:mb-12'>
                <h2 className='text-2xl sm:text-3xl font-bold mb-3 sm:mb-4 text-foreground'>Documentation</h2>
                <p className='text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed'>
                  Comprehensive guides, tutorials, and API documentation to help you get the most out of Agno WorkSphere
                </p>
              </div>

              <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8'>
                <div className='group bg-white rounded-2xl border border-gray-200/60 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden'>
                  <div className='p-6 sm:p-8'>
                    <div className='w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300'>
                      <Icon name='BookOpen' size={24} className='text-white sm:w-7 sm:h-7' />
                    </div>
                    <h3 className='text-xl sm:text-2xl font-bold mb-3 text-foreground group-hover:text-blue-600 transition-colors'>User Guide</h3>
                    <p className='text-muted-foreground mb-6 leading-relaxed'>Complete guide to using all features and capabilities of the platform</p>
                    <Button variant='outline' size='sm' iconName='ExternalLink' iconPosition='right' className='group-hover:border-blue-500 group-hover:text-blue-600 transition-colors'>
                      View Guide
                    </Button>
                  </div>
                </div>

                <div className='group bg-white rounded-2xl border border-gray-200/60 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden'>
                  <div className='p-6 sm:p-8'>
                    <div className='w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300'>
                      <Icon name='Code' size={24} className='text-white sm:w-7 sm:h-7' />
                    </div>
                    <h3 className='text-xl sm:text-2xl font-bold mb-3 text-foreground group-hover:text-green-600 transition-colors'>API Documentation</h3>
                    <p className='text-muted-foreground mb-6 leading-relaxed'>REST API reference with examples and integration guides</p>
                    <Button variant='outline' size='sm' iconName='ExternalLink' iconPosition='right' className='group-hover:border-green-500 group-hover:text-green-600 transition-colors'>
                      View API Docs
                    </Button>
                  </div>
                </div>

                <div className='group bg-white rounded-2xl border border-gray-200/60 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden'>
                  <div className='p-6 sm:p-8'>
                    <div className='w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300'>
                      <Icon name='Zap' size={24} className='text-white sm:w-7 sm:h-7' />
                    </div>
                    <h3 className='text-xl sm:text-2xl font-bold mb-3 text-foreground group-hover:text-purple-600 transition-colors'>Quick Start</h3>
                    <p className='text-muted-foreground mb-6 leading-relaxed'>Get up and running in minutes with our step-by-step setup guide</p>
                    <Button variant='outline' size='sm' iconName='ExternalLink' iconPosition='right' className='group-hover:border-purple-500 group-hover:text-purple-600 transition-colors'>
                      Quick Start
                    </Button>
                  </div>
                </div>

                <div className='group bg-white rounded-2xl border border-gray-200/60 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden'>
                  <div className='p-6 sm:p-8'>
                    <div className='w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300'>
                      <Icon name='Video' size={24} className='text-white sm:w-7 sm:h-7' />
                    </div>
                    <h3 className='text-xl sm:text-2xl font-bold mb-3 text-foreground group-hover:text-orange-600 transition-colors'>Video Tutorials</h3>
                    <p className='text-muted-foreground mb-6 leading-relaxed'>Step-by-step video guides and walkthroughs for all features</p>
                    <Button variant='outline' size='sm' iconName='ExternalLink' iconPosition='right' className='group-hover:border-orange-500 group-hover:text-orange-600 transition-colors'>
                      Watch Videos
                    </Button>
                  </div>
                </div>

                <div className='group bg-white rounded-2xl border border-gray-200/60 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden'>
                  <div className='p-6 sm:p-8'>
                    <div className='w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300'>
                      <Icon name='Download' size={24} className='text-white sm:w-7 sm:h-7' />
                    </div>
                    <h3 className='text-xl sm:text-2xl font-bold mb-3 text-foreground group-hover:text-red-600 transition-colors'>Downloads</h3>
                    <p className='text-muted-foreground mb-6 leading-relaxed'>Templates, guides, and helpful resources for your projects</p>
                    <Button variant='outline' size='sm' iconName='ExternalLink' iconPosition='right' className='group-hover:border-red-500 group-hover:text-red-600 transition-colors'>
                      Download Center
                    </Button>
                  </div>
                </div>

                <div className='group bg-white rounded-2xl border border-gray-200/60 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden'>
                  <div className='p-6 sm:p-8'>
                    <div className='w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300'>
                      <Icon name='MessageCircle' size={24} className='text-white sm:w-7 sm:h-7' />
                    </div>
                    <h3 className='text-xl sm:text-2xl font-bold mb-3 text-foreground group-hover:text-teal-600 transition-colors'>Community</h3>
                    <p className='text-muted-foreground mb-6 leading-relaxed'>Join our user community forum and connect with other users</p>
                    <Button variant='outline' size='sm' iconName='ExternalLink' iconPosition='right' className='group-hover:border-teal-500 group-hover:text-teal-600 transition-colors'>
                      Join Community
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Help Footer */}
        <div className='mt-16 sm:mt-20 pt-12 sm:pt-16 border-t border-gray-200/60'>
          <div className='text-center max-w-3xl mx-auto'>
            <div className='flex items-center justify-center gap-3 mb-6'>
              <div className='w-12 h-12 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl flex items-center justify-center'>
                <Icon name='Heart' size={20} className='text-primary' />
              </div>
              <h3 className='text-xl sm:text-2xl font-bold text-foreground'>Still Need Help?</h3>
            </div>

            <p className='text-muted-foreground mb-8 leading-relaxed'>
              Our support team is here to help you succeed. Don't hesitate to reach out if you can't find what you're looking for.
            </p>

            <div className='flex flex-col sm:flex-row items-center justify-center gap-4'>
              <Button
                onClick={() => setActiveTab('contact')}
                iconName='Mail'
                iconPosition='left'
                className='bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white font-semibold px-8 py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-200'
              >
                Contact Support
              </Button>
              <Button
                onClick={() => setShowTicketModal(true)}
                variant='outline'
                iconName='Ticket'
                iconPosition='left'
                className='border-gray-300 hover:border-primary hover:text-primary px-8 py-3 rounded-lg transition-all duration-200'
              >
                Create Ticket
              </Button>
            </div>

            <div className='mt-8 pt-8 border-t border-gray-200/60'>
              <p className='text-sm text-muted-foreground'>
                © 2024 Agno WorkSphere. All rights reserved. |
                <button className='text-primary hover:underline ml-1'>Privacy Policy</button> |
                <button className='text-primary hover:underline ml-1'>Terms of Service</button>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Support Ticket Modal */}
        <Modal isOpen={showTicketModal} onClose={() => setShowTicketModal(false)} title='Create Support Ticket'>
          <form onSubmit={handleTicketSubmit} className='space-y-4'>
            <Input
              label='Subject'
              type='text'
              value={ticketForm.subject}
              onChange={(e) => setTicketForm(prev => ({ ...prev, subject: e.target.value }))}
              placeholder='Brief description of your issue'
              required
            />

            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <Select
                label='Category'
                options={ticketCategories}
                value={ticketForm.category}
                onChange={(value) => setTicketForm(prev => ({ ...prev, category: value }))}
              />

              <Select
                label='Priority'
                options={priorityOptions}
                value={ticketForm.priority}
                onChange={(value) => setTicketForm(prev => ({ ...prev, priority: value }))}
              />
            </div>

            <Textarea
              label='Description'
              value={ticketForm.description}
              onChange={(e) => setTicketForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder='Please provide detailed information about your issue...'
              rows={6}
              required
            />

            <div className='flex items-center justify-end gap-3 pt-4'>
              <Button
                type='button'
                variant='outline'
                onClick={() => setShowTicketModal(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type='submit'
                disabled={isLoading}
                iconName={isLoading ? 'Loader2' : 'Send'}
                iconPosition='left'
              >
                {isLoading ? 'Creating...' : 'Create Ticket'}
              </Button>
            </div>
          </form>
        </Modal>
    </div>
  );
};

export default HelpSupport;
