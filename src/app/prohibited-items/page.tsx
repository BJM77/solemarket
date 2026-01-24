
import { PageHeader } from "@/components/layout/PageHeader";
import { AlertTriangle } from "lucide-react";

const prohibitedCategories = [
    {
        category: "Illegal Items",
        items: ["Counterfeit or replica items", "Stolen goods", "Firearms, ammunition, and explosives", "Illegal drugs and drug paraphernalia"]
    },
    {
        category: "Hazardous Materials",
        items: ["Flammable materials", "Toxic substances", "Radioactive materials"]
    },
    {
        category: "Adult Content",
        items: ["Pornographic materials", "Items depicting explicit or obscene content"]
    },
    {
        category: "Other",
        items: ["Human remains or body parts", "Services or intangible items", "Items that infringe on intellectual property rights"]
    }
];

export default function ProhibitedItemsPage() {
  return (
    <div className="container py-12 md:py-16">
        <PageHeader
            title="Prohibited Items Policy"
            description="To maintain a safe and trusted marketplace, certain items are not allowed on Picksy."
        />

        <div className="prose lg:prose-lg max-w-4xl mx-auto mt-8">
            <div className="bg-destructive/10 border-l-4 border-destructive text-destructive p-4 rounded-md" role="alert">
                <div className="flex">
                    <div className="flex-shrink-0">
                    <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div className="ml-3">
                    <p className="font-bold">Important Notice</p>
                    <p className="text-sm">
                        Listing prohibited items will result in the removal of the listing and may lead to suspension of your account.
                    </p>
                    </div>
                </div>
            </div>

            <p>
                The following list provides a non-exhaustive overview of items that are not permitted to be sold on the Picksy platform. All users are responsible for ensuring their listings comply with all local, state, and federal laws.
            </p>
            
            {prohibitedCategories.map(cat => (
                <div key={cat.category}>
                    <h3>{cat.category}</h3>
                    <ul>
                        {cat.items.map(item => <li key={item}>{item}</li>)}
                    </ul>
                </div>
            ))}
        </div>
    </div>
  );
}
