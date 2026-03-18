import Link from 'next/link'
import { Button } from '@/src/components/ui/button'
import { CheckCircle, Database, Sparkles, Shield } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Database className="h-6 w-6 text-blue-600" />
            <span className="text-xl font-bold">CleanData CRM</span>
          </div>
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-gray-600 hover:text-gray-900">Features</a>
            <a href="#pricing" className="text-gray-600 hover:text-gray-900">Pricing</a>
            <Link href="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/signup">
              <Button>Get Started Free</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-20 pb-32 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-gray-900 mb-6">
            Clean Your CRM Data
            <span className="text-blue-600"> Automatically</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            AI-powered deduplication and enrichment for Salesforce. Remove duplicates, 
            enrich contacts with free government data, and keep your CRM clean.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup">
              <Button size="lg" className="px-8">
                Start Free Trial
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="px-8">
                Sign In
              </Button>
            </Link>
          </div>
          <p className="mt-4 text-sm text-gray-500">No credit card required. Free for up to 1,000 contacts.</p>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">Everything You Need</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Sparkles className="h-8 w-8 text-blue-600" />}
              title="Smart Deduplication"
              description="AI-powered fuzzy matching with Jaro-Winkler and phonetic algorithms to find duplicates humans miss."
            />
            <FeatureCard
              icon={<Database className="h-8 w-8 text-green-600" />}
              title="Free Data Enrichment"
              description="Enrich contacts with ABN Lookup, ASIC data, and website intelligence at zero cost."
            />
            <FeatureCard
              icon={<Shield className="h-8 w-8 text-purple-600" />}
              title="Salesforce Native"
              description="Seamless two-way sync with Salesforce. Your data stays in your CRM, we just clean it."
            />
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">Simple Pricing</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <PricingCard
              name="Starter"
              price="$0"
              description="Perfect for trying out"
              features={[
                'Up to 1,000 contacts',
                'Basic deduplication',
                'ABN Lookup (AU)',
                'Website scraping',
                'Monthly refresh',
              ]}
              cta="Get Started Free"
              href="/signup"
            />
            <PricingCard
              name="Growth"
              price="$299"
              period="/month"
              description="For growing businesses"
              features={[
                'Up to 10,000 contacts',
                'Everything in Starter',
                'US data enrichment',
                'Advanced fuzzy matching',
                'Weekly refresh',
                'Email validation',
              ]}
              cta="Start Free Trial"
              href="/signup"
              popular
            />
            <PricingCard
              name="Professional"
              price="$799"
              period="/month"
              description="For larger organizations"
              features={[
                'Up to 50,000 contacts',
                'Everything in Growth',
                'LinkedIn enrichment',
                '$100 API credits/mo',
                'Daily refresh',
                'Priority support',
              ]}
              cta="Contact Sales"
              href="/signup"
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Database className="h-6 w-6 text-blue-400" />
              <span className="text-lg font-semibold">CleanData CRM</span>
            </div>
            <p className="text-gray-400 text-sm">© 2026 CleanData CRM. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="p-6 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  )
}

function PricingCard({
  name,
  price,
  period,
  description,
  features,
  cta,
  href,
  popular,
}: {
  name: string
  price: string
  period?: string
  description: string
  features: string[]
  cta: string
  href: string
  popular?: boolean
}) {
  return (
    <div className={`p-6 rounded-2xl border ${popular ? 'border-blue-500 shadow-lg scale-105' : 'border-gray-200'} bg-white`}>
      {popular && (
        <span className="inline-block px-3 py-1 text-xs font-semibold text-blue-600 bg-blue-50 rounded-full mb-4">
          Most Popular
        </span>
      )}
      <h3 className="text-2xl font-bold">{name}</h3>
      <p className="text-gray-500 mt-2">{description}</p>
      <div className="mt-4 mb-6">
        <span className="text-4xl font-bold">{price}</span>
        {period && <span className="text-gray-500">{period}</span>}
      </div>
      <ul className="space-y-3 mb-6">
        {features.map((feature) => (
          <li key={feature} className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span className="text-gray-600">{feature}</span>
          </li>
        ))}
      </ul>
      <Link href={href} className="block">
        <Button className="w-full" variant={popular ? 'default' : 'outline'}>
          {cta}
        </Button>
      </Link>
    </div>
  )
}