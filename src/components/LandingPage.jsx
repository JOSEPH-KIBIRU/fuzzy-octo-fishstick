// components/LandingPage/LandingPage.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Building2, 
  Users, 
  Calendar, 
  FileText, 
  BarChart3, 
  Shield,
  ArrowRight,
  CheckCircle,
  Mail,
  Phone,
  Globe,
  Check,
  X,
  Zap
} from 'lucide-react';

const LandingPage = () => {
  const [activeFeature, setActiveFeature] = useState(0);
  const [billingPeriod, setBillingPeriod] = useState('monthly');

  const features = [
    {
      icon: <Users size={48} />,
      title: 'Team Management',
      description: 'Manage employee profiles, roles, and permissions with ease.',
      color: '#3B82F6'
    },
    {
      icon: <Calendar size={48} />,
      title: 'Smart Scheduling',
      description: 'Book meeting rooms, schedule appointments, and track availability.',
      color: '#10B981'
    },
    {
      icon: <FileText size={48} />,
      title: 'Document Management',
      description: 'Store, organize, and share important documents securely.',
      color: '#8B5CF6'
    },
    {
      icon: <BarChart3 size={48} />,
      title: 'Analytics Dashboard',
      description: 'Gain insights with real-time reports and analytics.',
      color: '#F59E0B'
    },
    {
      icon: <Shield size={48} />,
      title: 'Security & Compliance',
      description: 'Enterprise-grade security with role-based access control.',
      color: '#EF4444'
    },
    {
      icon: <Globe size={48} />,
      title: 'Remote Collaboration',
      description: 'Work seamlessly with your team from anywhere.',
      color: '#06B6D4'
    }
  ];

  // Pricing plans data
  const pricingPlans = [
    {
      id: 'starter',
      name: 'Starter',
      description: 'Perfect for small businesses & startups',
      price: {
        monthly: 1499, // KES per month
        yearly: 14391, // KES per year (20% discount)
      },
      features: [
        { text: 'Up to 5 employees', included: true },
        { text: 'Basic task management', included: true },
        { text: 'Document storage (5GB)', included: true },
        { text: 'Email support', included: true },
        { text: '1 department', included: true },
        { text: 'Basic reporting', included: true },
        { text: 'Mobile app access', included: true },
        { text: 'Data backup (weekly)', included: true },
        { text: 'Advanced analytics', included: false },
        { text: 'Priority support', included: false },
        { text: 'API access', included: false },
      ],
      popular: false,
      color: 'blue',
      ctaText: 'Start Free Trial',
      ctaLink: '/register?plan=starter'
    },
    {
      id: 'pro',
      name: 'Professional',
      description: 'For growing businesses',
      price: {
        monthly: 2999,
        yearly: 28791,
      },
      features: [
        { text: 'Up to 20 employees', included: true },
        { text: 'Advanced task management', included: true },
        { text: 'Document storage (50GB)', included: true },
        { text: 'Priority email & chat support', included: true },
        { text: 'Up to 5 departments', included: true },
        { text: 'Advanced analytics & reports', included: true },
        { text: 'Time tracking', included: true },
        { text: 'Inventory management', included: true },
        { text: 'Data backup (daily)', included: true },
        { text: 'Custom workflows', included: true },
        { text: 'API access', included: true },
      ],
      popular: true,
      color: 'purple',
      ctaText: 'Try Professional Free',
      ctaLink: '/register?plan=pro'
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      description: 'For large organizations',
      price: {
        monthly: 4999,
        yearly: 47990,
      },
      features: [
        { text: 'Unlimited employees', included: true },
        { text: 'Unlimited storage', included: true },
        { text: '24/7 phone support', included: true },
        { text: 'Unlimited departments', included: true },
        { text: 'Advanced AI analytics', included: true },
        { text: 'HR management', included: true },
        { text: 'Payroll integration', included: true },
        { text: 'Custom reporting', included: true },
        { text: 'White-label solution', included: true },
        { text: 'SLA 99.9% uptime', included: true },
        { text: 'Dedicated account manager', included: true },
        { text: 'On-premise deployment option', included: true },
      ],
      popular: false,
      color: 'green',
      ctaText: 'Contact Sales',
      ctaLink: '/contact'
    }
  ];

  // Additional services
  const addons = [
    {
      id: 'sms',
      name: 'SMS Notifications',
      description: 'Send SMS alerts to employees & clients',
      price: 200, // KES per month
      per: '100 SMS credits'
    },
    {
      id: 'training',
      name: 'Onboarding Training',
      description: 'Personalized training sessions',
      price: 5000,
      per: 'per session'
    },
    {
      id: 'custom',
      name: 'Custom Development',
      description: 'Tailor features to your needs',
      price: 'Custom',
      per: 'project-based'
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % features.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [features.length]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const scrollToPricing = () => {
    const pricingSection = document.getElementById('pricing');
    if (pricingSection) {
      pricingSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="landing-page">
      {/* Navigation Bar */}
      <nav className="landing-nav">
        <div className="nav-container">
          <div className="nav-brand">
            <Building2 size={32} />
            <span>OfficeManager</span>
          </div>
          
          <div className="nav-links">
            <a href="#features">Features</a>
            <a href="#how-it-works">How it Works</a>
            <a href="#testimonials">Testimonials</a>
            <a href="#pricing" onClick={(e) => {
              e.preventDefault();
              scrollToPricing();
            }}>Pricing</a>
          </div>
          
          <div className="auth-buttons">
            <Link to="/login" className="login-btn">
              Log In
            </Link>
            <Link to="/register" className="signup-btn">
              Sign Up
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1>Streamline Your Office Management</h1>
          <p className="hero-subtitle">
            All-in-one platform to manage your office operations, employees, and resources efficiently.
            Boost productivity with our comprehensive office management solution.
          </p>
          <div className="hero-buttons">
            <Link to="/register" className="cta-primary">
              Get Started Free
              <ArrowRight size={20} />
            </Link>
            <button onClick={scrollToPricing} className="cta-secondary">
              View Pricing
            </button>
          </div>
          
          <div className="hero-stats">
            <div className="stat">
              <span className="stat-number">500+</span>
              <span className="stat-label">Companies</span>
            </div>
            <div className="stat">
              <span className="stat-number">50K+</span>
              <span className="stat-label">Active Users</span>
            </div>
            <div className="stat">
              <span className="stat-number">99.9%</span>
              <span className="stat-label">Uptime</span>
            </div>
            <div className="stat">
              <span className="stat-number">24/7</span>
              <span className="stat-label">Support</span>
            </div>
          </div>
        </div>
        
        <div className="hero-image">
          <div className="dashboard-preview">
            <div className="dashboard-header">
              <div className="dashboard-nav">
                <div className="nav-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <div className="dashboard-title">Office Management Dashboard</div>
              </div>
              <div className="dashboard-content">
                <div className="dashboard-widget" style={{ background: features[activeFeature].color }}>
                  {features[activeFeature].icon}
                  <h4>{features[activeFeature].title}</h4>
                </div>
                <div className="dashboard-grid">
                  <div className="grid-item"></div>
                  <div className="grid-item"></div>
                  <div className="grid-item"></div>
                  <div className="grid-item"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features-section">
        <div className="section-header">
          <h2>Everything You Need in One Platform</h2>
          <p>Comprehensive tools to manage your entire office ecosystem</p>
        </div>
        
        <div className="features-grid">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className="feature-card"
              onMouseEnter={() => setActiveFeature(index)}
            >
              <div className="feature-icon" style={{ color: feature.color }}>
                {feature.icon}
              </div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
              <ul className="feature-list">
                <li><CheckCircle size={16} /> Real-time updates</li>
                <li><CheckCircle size={16} /> Custom workflows</li>
                <li><CheckCircle size={16} /> Team collaboration</li>
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="how-it-works">
        <div className="section-header">
          <h2>How It Works</h2>
          <p>Get started in minutes with our simple process</p>
        </div>
        
        <div className="steps-container">
          <div className="step">
            <div className="step-number">1</div>
            <div className="step-content">
              <h3>Sign Up</h3>
              <p>Create your account with your company email</p>
            </div>
          </div>
          
          <div className="step-arrow">→</div>
          
          <div className="step">
            <div className="step-number">2</div>
            <div className="step-content">
              <h3>Admin Approval</h3>
              <p>Your company admin approves your access</p>
            </div>
          </div>
          
          <div className="step-arrow">→</div>
          
          <div className="step">
            <div className="step-number">3</div>
            <div className="step-content">
              <h3>Get Started</h3>
              <p>Access all features and customize your workspace</p>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING SECTION - NEW */}
      <section id="pricing" className="pricing-section">
        <div className="section-header">
          <h2>Transparent Pricing for Kenyan Businesses</h2>
          <p className="section-subtitle">No hidden fees. Cancel anytime. All prices include VAT.</p>
          
          {/* Billing Period Toggle */}
          <div className="billing-toggle">
            <button
              className={`billing-toggle-btn ${billingPeriod === 'monthly' ? 'active' : ''}`}
              onClick={() => setBillingPeriod('monthly')}
            >
              Monthly
            </button>
            <button
              className={`billing-toggle-btn ${billingPeriod === 'yearly' ? 'active' : ''}`}
              onClick={() => setBillingPeriod('yearly')}
            >
              Yearly <span className="save-badge">Save 20%</span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="pricing-cards">
          {pricingPlans.map((plan) => (
            <div
              key={plan.id}
              className={`pricing-card ${plan.popular ? 'popular' : ''}`}
            >
              {plan.popular && (
                <div className="popular-badge">
                  <Zap size={16} /> Most Popular
                </div>
              )}
              
              <div className="plan-header">
                <h3>{plan.name}</h3>
                <p className="plan-description">{plan.description}</p>
                
                <div className="plan-price">
                  <span className="price-amount">
                    {formatCurrency(plan.price[billingPeriod])}
                  </span>
                  <span className="price-period">
                    /{billingPeriod === 'yearly' ? 'year' : 'month'}
                  </span>
                </div>
                
                {billingPeriod === 'yearly' && (
                  <p className="price-savings">
                    Save {formatCurrency((plan.price.monthly * 12) - plan.price.yearly)} yearly
                  </p>
                )}
              </div>

              <div className="plan-features">
                <h4>What's included:</h4>
                <ul className="features-list">
                  {plan.features.map((feature, index) => (
                    <li key={index} className={`feature-item ${feature.included ? 'included' : 'not-included'}`}>
                      {feature.included ? (
                        <Check size={16} className="feature-icon-check" />
                      ) : (
                        <X size={16} className="feature-icon-x" />
                      )}
                      <span>{feature.text}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="plan-cta">
                <Link
                  to={plan.ctaLink}
                  className={`pricing-cta-btn ${plan.popular ? 'popular-btn' : 'standard-btn'}`}
                >
                  {plan.ctaText}
                  <ArrowRight size={20} />
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Additional Services */}
        <div className="addons-section">
          <div className="section-header">
            <h3>Additional Services</h3>
            <p>Enhance your experience with these add-ons</p>
          </div>
          
          <div className="addons-grid">
            {addons.map((addon) => (
              <div key={addon.id} className="addon-card">
                <h4>{addon.name}</h4>
                <p>{addon.description}</p>
                <div className="addon-price">
                  {addon.price === 'Custom' ? (
                    <span className="custom-price">Custom Pricing</span>
                  ) : (
                    <>
                      <span className="price-amount">{formatCurrency(addon.price)}</span>
                      <span className="price-period">/{addon.per}</span>
                    </>
                  )}
                </div>
                <Link to="/contact" className="addon-btn">
                  Learn More
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Free Trial Notice */}
        <div className="free-trial-notice">
          <div className="trial-content">
            <h3>Start with a 14-Day Free Trial</h3>
            <p>Try all Professional features for free. No credit card required.</p>
            <div className="trial-features">
              <span><Check size={16} /> Full access to all features</span>
              <span><Check size={16} /> Up to 20 employees</span>
              <span><Check size={16} /> 50GB storage</span>
              <span><Check size={16} /> Priority support</span>
            </div>
            <Link to="/register" className="trial-cta-btn">
              Start Free Trial
              <ArrowRight size={20} />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-content">
          <h2>Ready to Transform Your Office Management?</h2>
          <p>Join thousands of companies that trust OfficeManager</p>
          <div className="cta-buttons">
            <Link to="/register" className="cta-primary">
              Start Free Trial
              <ArrowRight size={20} />
            </Link>
            <button onClick={scrollToPricing} className="cta-secondary">
              View Pricing
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <Building2 size={32} />
            <span>OfficeManager</span>
            <p>Streamline your office, amplify your productivity.</p>
          </div>
          
          <div className="footer-links">
            <div className="link-group">
              <h4>Product</h4>
              <a href="#features">Features</a>
              <a href="#pricing">Pricing</a>
              <a href="#integrations">Integrations</a>
              <a href="#updates">Updates</a>
            </div>
            
            <div className="link-group">
              <h4>Company</h4>
              <a href="#about">About</a>
              <a href="#careers">Careers</a>
              <a href="#blog">Blog</a>
              <a href="#press">Press</a>
            </div>
            
            <div className="link-group">
              <h4>Support</h4>
              <a href="#help">Help Center</a>
              <a href="#contact">Contact Us</a>
              <a href="#privacy">Privacy Policy</a>
              <a href="#terms">Terms of Service</a>
            </div>
            
            <div className="link-group">
              <h4>Connect</h4>
              <div className="social-links">
                <a href="#twitter">Twitter</a>
                <a href="#linkedin">LinkedIn</a>
                <a href="#facebook">Facebook</a>
                <a href="#github">GitHub</a>
              </div>
            </div>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} OfficeManager. All rights reserved.</p>
          <div className="footer-contact">
            <span><Mail size={16} /> support@officemanager.com</span>
            <span><Phone size={16} /> +254 798-118-515</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;