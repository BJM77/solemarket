
import { Shield, Truck, DollarSign, Users, Clock, Headphones } from "lucide-react";

const features = [
  {
    icon: Truck,
    title: "Secure Shipping",
    description: "Insured and tracked shipping with specialized packaging for collectibles.",
  },
  {
    icon: Clock,
    title: "Fast Transactions",
    description: "Quick payment processing and fast shipping for a seamless experience.",
  },
  {
    icon: Headphones,
    title: "Dedicated Support",
    description: "24/7 customer support from collectible experts ready to help you.",
  },
];

export default function WhyChooseUs() {
  return (
    <section className="py-16">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Collectors Choose Picksy</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          We've built the ultimate platform for collectors with features designed specifically for the collecting community
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {features.map((feature) => (
          <div key={feature.title} className="p-6 border rounded-xl hover:border-primary transition-colors">
            <div className="inline-flex p-3 rounded-lg bg-primary/10 text-primary mb-4">
              <feature.icon className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
            <p className="text-muted-foreground">{feature.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
