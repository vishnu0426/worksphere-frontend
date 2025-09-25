/**
 * Comprehensive Button Audit Utility
 * This utility scans the application for buttons and their functionality
 */

export class ButtonAudit {
  constructor() {
    this.auditResults = [];
    this.buttonCount = 0;
    this.functionalButtons = 0;
    this.nonFunctionalButtons = 0;
  }

  /**
   * Scan the DOM for all buttons and interactive elements
   */
  scanButtons() {
    console.log('🔍 Starting comprehensive button audit...');
    
    // Find all button elements
    const buttons = document.querySelectorAll('button, [role="button"], input[type="button"], input[type="submit"]');
    const links = document.querySelectorAll('a[href]');
    
    this.buttonCount = buttons.length + links.length;
    
    console.log(`📊 Found ${buttons.length} buttons and ${links.length} links`);
    
    // Audit buttons
    buttons.forEach((button, index) => {
      this.auditButton(button, `button-${index}`, 'button');
    });
    
    // Audit links
    links.forEach((link, index) => {
      this.auditButton(link, `link-${index}`, 'link');
    });
    
    this.generateReport();
  }

  /**
   * Audit individual button functionality
   */
  auditButton(element, id, type) {
    const buttonInfo = {
      id,
      type,
      element,
      text: element.textContent?.trim() || element.getAttribute('aria-label') || 'No text',
      disabled: element.disabled || element.getAttribute('aria-disabled') === 'true',
      hasClickHandler: false,
      hasHref: false,
      functionality: 'unknown',
      issues: [],
      location: this.getElementLocation(element)
    };

    // Check for click handlers
    if (element.onclick || element.addEventListener || this.hasReactEventHandler(element)) {
      buttonInfo.hasClickHandler = true;
      this.functionalButtons++;
    }

    // Check for href (links)
    if (element.href && element.href !== '#' && element.href !== 'javascript:void(0)') {
      buttonInfo.hasHref = true;
      this.functionalButtons++;
    }

    // Determine functionality status
    if (buttonInfo.disabled) {
      buttonInfo.functionality = 'disabled';
    } else if (buttonInfo.hasClickHandler || buttonInfo.hasHref) {
      buttonInfo.functionality = 'functional';
    } else {
      buttonInfo.functionality = 'non-functional';
      buttonInfo.issues.push('No click handler or href found');
      this.nonFunctionalButtons++;
    }

    // Check for accessibility issues
    this.checkAccessibility(element, buttonInfo);

    // Check for loading states
    this.checkLoadingStates(element, buttonInfo);

    this.auditResults.push(buttonInfo);
  }

  /**
   * Check if element has React event handlers
   */
  hasReactEventHandler(element) {
    // Check for React fiber properties that might indicate event handlers
    const reactKeys = Object.keys(element).filter(key => 
      key.startsWith('__reactInternalInstance') || 
      key.startsWith('__reactFiber') ||
      key.startsWith('_reactInternalFiber')
    );
    
    if (reactKeys.length > 0) {
      return true;
    }

    // Check for common React event attributes
    const reactEventAttrs = ['onClick', 'onSubmit', 'onMouseDown', 'onKeyDown'];
    return reactEventAttrs.some(attr => element.hasAttribute(attr.toLowerCase()));
  }

  /**
   * Get element location information
   */
  getElementLocation(element) {
    const rect = element.getBoundingClientRect();
    const path = this.getElementPath(element);
    
    return {
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      visible: rect.width > 0 && rect.height > 0,
      path
    };
  }

  /**
   * Get CSS selector path for element
   */
  getElementPath(element) {
    const path = [];
    let current = element;
    
    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase();
      
      if (current.id) {
        selector += `#${current.id}`;
      } else if (current.className) {
        const classes = current.className.split(' ').filter(c => c.trim());
        if (classes.length > 0) {
          selector += `.${classes.slice(0, 2).join('.')}`;
        }
      }
      
      path.unshift(selector);
      current = current.parentElement;
    }
    
    return path.join(' > ');
  }

  /**
   * Check accessibility compliance
   */
  checkAccessibility(element, buttonInfo) {
    // Check for aria-label or text content
    if (!element.textContent?.trim() && !element.getAttribute('aria-label')) {
      buttonInfo.issues.push('Missing accessible text or aria-label');
    }

    // Check for proper role
    if (element.tagName.toLowerCase() !== 'button' && !element.getAttribute('role')) {
      buttonInfo.issues.push('Non-button element without proper role');
    }

    // Check for keyboard accessibility
    if (element.tabIndex < 0) {
      buttonInfo.issues.push('Element not keyboard accessible (negative tabIndex)');
    }
  }

  /**
   * Check for loading states and error handling
   */
  checkLoadingStates(element, buttonInfo) {
    const hasLoadingClass = element.classList.contains('loading') || 
                           element.classList.contains('disabled') ||
                           element.querySelector('.loading, .spinner');
    
    if (!hasLoadingClass) {
      buttonInfo.issues.push('No loading state implementation detected');
    }
  }

  /**
   * Generate comprehensive audit report
   */
  generateReport() {
    const report = {
      summary: {
        totalButtons: this.buttonCount,
        functionalButtons: this.functionalButtons,
        nonFunctionalButtons: this.nonFunctionalButtons,
        functionalityRate: Math.round((this.functionalButtons / this.buttonCount) * 100)
      },
      categories: this.categorizeButtons(),
      issues: this.getCommonIssues(),
      recommendations: this.getRecommendations(),
      detailedResults: this.auditResults
    };

    console.log('📋 Button Audit Report:');
    console.log('='.repeat(50));
    console.log(`Total Buttons: ${report.summary.totalButtons}`);
    console.log(`Functional: ${report.summary.functionalButtons} (${report.summary.functionalityRate}%)`);
    console.log(`Non-Functional: ${report.summary.nonFunctionalButtons}`);
    console.log('='.repeat(50));

    // Log categories
    Object.entries(report.categories).forEach(([category, buttons]) => {
      console.log(`${category}: ${buttons.length} buttons`);
    });

    // Log common issues
    console.log('\n🚨 Common Issues:');
    report.issues.forEach(issue => {
      console.log(`- ${issue.issue}: ${issue.count} occurrences`);
    });

    // Log recommendations
    console.log('\n💡 Recommendations:');
    report.recommendations.forEach(rec => {
      console.log(`- ${rec}`);
    });

    return report;
  }

  /**
   * Categorize buttons by functionality
   */
  categorizeButtons() {
    const categories = {
      'Navigation Buttons': [],
      'Form Buttons': [],
      'Action Buttons': [],
      'Toggle Buttons': [],
      'Non-Functional Buttons': [],
      'Disabled Buttons': []
    };

    this.auditResults.forEach(button => {
      if (button.functionality === 'disabled') {
        categories['Disabled Buttons'].push(button);
      } else if (button.functionality === 'non-functional') {
        categories['Non-Functional Buttons'].push(button);
      } else if (button.hasHref) {
        categories['Navigation Buttons'].push(button);
      } else if (button.element.type === 'submit') {
        categories['Form Buttons'].push(button);
      } else if (button.text.toLowerCase().includes('toggle') || 
                 button.element.getAttribute('aria-pressed')) {
        categories['Toggle Buttons'].push(button);
      } else {
        categories['Action Buttons'].push(button);
      }
    });

    return categories;
  }

  /**
   * Get common issues across buttons
   */
  getCommonIssues() {
    const issueMap = {};
    
    this.auditResults.forEach(button => {
      button.issues.forEach(issue => {
        issueMap[issue] = (issueMap[issue] || 0) + 1;
      });
    });

    return Object.entries(issueMap)
      .map(([issue, count]) => ({ issue, count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Generate recommendations based on audit results
   */
  getRecommendations() {
    const recommendations = [];
    
    if (this.nonFunctionalButtons > 0) {
      recommendations.push(`Fix ${this.nonFunctionalButtons} non-functional buttons by adding click handlers`);
    }

    const accessibilityIssues = this.auditResults.filter(b => 
      b.issues.some(i => i.includes('accessible') || i.includes('aria-label'))
    ).length;
    
    if (accessibilityIssues > 0) {
      recommendations.push(`Improve accessibility for ${accessibilityIssues} buttons`);
    }

    const loadingIssues = this.auditResults.filter(b => 
      b.issues.some(i => i.includes('loading'))
    ).length;
    
    if (loadingIssues > 0) {
      recommendations.push(`Add loading states to ${loadingIssues} buttons`);
    }

    return recommendations;
  }

  /**
   * Test button functionality by simulating clicks
   */
  async testButtonFunctionality(maxTests = 10) {
    console.log('🧪 Testing button functionality...');
    
    const testableButtons = this.auditResults
      .filter(b => b.functionality === 'functional' && !b.disabled)
      .slice(0, maxTests);

    for (const buttonInfo of testableButtons) {
      try {
        console.log(`Testing: ${buttonInfo.text}`);
        
        // Simulate click
        const clickEvent = new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window
        });
        
        buttonInfo.element.dispatchEvent(clickEvent);
        
        // Wait a bit to see if anything happens
        await new Promise(resolve => setTimeout(resolve, 100));
        
        buttonInfo.testResult = 'clicked';
      } catch (error) {
        console.error(`Error testing button "${buttonInfo.text}":`, error);
        buttonInfo.testResult = 'error';
        buttonInfo.testError = error.message;
      }
    }
  }
}

// Export utility functions
export const runButtonAudit = () => {
  const audit = new ButtonAudit();
  return audit.scanButtons();
};

export const testButtonFunctionality = async (maxTests = 10) => {
  const audit = new ButtonAudit();
  audit.scanButtons();
  await audit.testButtonFunctionality(maxTests);
  return audit.auditResults;
};

// Auto-run audit if in development mode
if (process.env.NODE_ENV === 'development') {
  // Add to window for manual testing
  window.buttonAudit = {
    run: runButtonAudit,
    test: testButtonFunctionality,
    ButtonAudit
  };
}
