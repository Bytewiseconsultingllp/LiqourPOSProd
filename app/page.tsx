'use client';

import { useEffect, useState } from 'react';
import heroImage from "@/assets/hero-liquor-pos.jpg";
import { ArrowRight, BarChart3, Clock, CreditCard, Download, FileText, Package, Shield, Smartphone, TrendingUp, Users, Wine, Zap } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './dashboard/components/ui/card';
import { Button } from './dashboard/components/ui/button';

export default function Home() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    console.log('🔍 PWA Install Check Started');

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      console.log('✅ App already installed');
      setIsInstalled(true);
      return;
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('🎉 beforeinstallprompt event fired!');
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    console.log('👂 Listening for beforeinstallprompt event...');

    // Check PWA requirements
    setTimeout(() => {
      console.log('📋 PWA Status Check:');
      console.log('  - HTTPS:', window.location.protocol === 'https:' || window.location.hostname === 'localhost');
      console.log('  - Service Worker:', 'serviceWorker' in navigator);
      console.log('  - Manifest:', document.querySelector('link[rel="manifest"]') !== null);
    }, 1000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      alert('Install prompt not available. Please use your browser\'s install option from the menu.');
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('✅ User accepted install');
    }

    setDeferredPrompt(null);
    setIsInstallable(false);
  };
  const currentYear = new Date().getFullYear();
  const features = [
    {
      icon: Package,
      title: "Inventory Management",
      description:
        "Track stock levels in real-time, automate reordering, and manage multiple locations effortlessly.",
    },
    {
      icon: Users,
      title: "Customer Management",
      description:
        "Build customer profiles, track purchase history, and create personalized loyalty programs.",
    },
    {
      icon: TrendingUp,
      title: "Sales Analytics",
      description:
        "Gain insights with comprehensive reports on sales trends, top products, and performance metrics.",
    },
    {
      icon: Clock,
      title: "Fast Checkout",
      description:
        "Process transactions quickly with barcode scanning, multiple payment methods, and split payments.",
    },
    {
      icon: CreditCard,
      title: "Payment Processing",
      description:
        "Accept all major credit cards, mobile payments, and integrate with popular payment gateways.",
    },
    {
      icon: FileText,
      title: "Compliance Tools",
      description:
        "Built-in age verification, license tracking, and automated compliance reporting for peace of mind.",
    },
  ];
  return (
    <>
      <section id="home" className="relative min-h-screen flex items-center pt-16">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <img
            src={heroImage.src}
            alt="Premium liquor bar"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/90 to-background/70" />
        </div>

        {/* Content */}
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
              Transform Your Liquor Store with{" "}
              <span className="text-primary">Smart POS</span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground mb-8 leading-relaxed">
              Streamline inventory, boost sales, and enhance customer experience with our
              industry-leading point of sale system designed specifically for liquor retailers.
            </p>

            {/* CTA Buttons */}
            {/* <div className="flex flex-col sm:flex-row gap-4 mb-12">
              <Button size="lg" variant="hero">
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline">
                Watch Demo
              </Button>
            </div> */}

            {/* Quick Features */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Lightning Fast</p>
                  <p className="text-sm text-muted-foreground">Quick checkout</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Smart Analytics</p>
                  <p className="text-sm text-muted-foreground">Real-time insights</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Secure & Compliant</p>
                  <p className="text-sm text-muted-foreground">Age verification</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section id="features" className="py-20 bg-muted/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Everything You Need to Succeed
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Powerful features designed specifically for liquor retailers to streamline operations
              and maximize profits.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className="border-border hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="p-3 rounded-lg bg-primary/10 w-fit mb-4">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-foreground">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-muted-foreground">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>
      <footer className="bg-card border-t border-border py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            {/* Brand */}
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <Wine className="h-8 w-8 text-primary" />
                <span className="text-xl font-bold text-foreground">LiquorPOS</span>
              </div>
              <p className="text-muted-foreground mb-4">
                The leading point of sale system for liquor retailers. Streamline your operations and
                grow your business with confidence.
              </p>
            </div>

            {/* Product */}
            <div>
              <h3 className="font-semibold text-foreground mb-4">Product</h3>
              <ul className="space-y-2">
                <li>
                  <a href="#features" className="text-muted-foreground hover:text-primary transition-colors">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="text-muted-foreground hover:text-primary transition-colors">
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                    Integrations
                  </a>
                </li>
                <li>
                  <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                    Updates
                  </a>
                </li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h3 className="font-semibold text-foreground mb-4">Company</h3>
              <ul className="space-y-2">
                <li>
                  <a href="#about" className="text-muted-foreground hover:text-primary transition-colors">
                    About
                  </a>
                </li>
                <li>
                  <a href="#contact" className="text-muted-foreground hover:text-primary transition-colors">
                    Contact
                  </a>
                </li>
                <li>
                  <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                    Privacy
                  </a>
                </li>
                <li>
                  <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                    Terms
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-border text-center text-muted-foreground">
            <p>&copy; {currentYear} LiquorPOS. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </>
  );
}
