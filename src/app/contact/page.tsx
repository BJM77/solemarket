import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, MessageSquare, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function ContactPage() {
    return (
        <div className="container py-12 md:py-16">
            <PageHeader
                title="Contact Us"
                description="We're here to help. Get in touch with the Picksy team."
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mt-12">
                {/* Contact Info */}
                <div className="space-y-8">
                    <h2 className="text-2xl font-bold">Get in Touch</h2>
                    <p className="text-muted-foreground text-lg">
                        Whether you have a question about a listing, need help with your account, or just want to talk collectibles, we're here for you.
                    </p>

                    <div className="grid gap-6">
                        <Card>
                            <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                                <div className="bg-primary/10 p-3 rounded-full">
                                    <Mail className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                    <CardTitle className="text-base">Email Us</CardTitle>
                                    <p className="text-sm text-muted-foreground">For general inquiries</p>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <a href="mailto:support@picksy.au" className="text-primary hover:underline font-medium">support@picksy.au</a>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                                <div className="bg-primary/10 p-3 rounded-full">
                                    <MessageSquare className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                    <CardTitle className="text-base">Legal & Privacy</CardTitle>
                                    <p className="text-sm text-muted-foreground">For compliance matters</p>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <a href="mailto:legal@picksy.au" className="text-primary hover:underline font-medium">legal@picksy.au</a>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                                <div className="bg-primary/10 p-3 rounded-full">
                                    <MapPin className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                    <CardTitle className="text-base">Located In</CardTitle>
                                    <p className="text-sm text-muted-foreground">Our Headquarters</p>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="font-medium">Perth, Western Australia</p>
                                <p className="text-sm text-muted-foreground mt-1">Operating nationwide</p>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Contact Form */}
                <Card className="p-6">
                    <CardHeader className="px-0 pt-0">
                        <CardTitle>Send us a Message</CardTitle>
                    </CardHeader>
                    <CardContent className="px-0 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label htmlFor="name" className="text-sm font-medium">Name</label>
                                <Input id="name" placeholder="Your name" />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="email" className="text-sm font-medium">Email</label>
                                <Input id="email" type="email" placeholder="Your email" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="subject" className="text-sm font-medium">Subject</label>
                            <Input id="subject" placeholder="What can we help you with?" />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="message" className="text-sm font-medium">Message</label>
                            <Textarea id="message" placeholder="Type your message here..." className="min-h-[150px]" />
                        </div>

                        <Button className="w-full">Send Message</Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
