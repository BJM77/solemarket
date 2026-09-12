
interface PageHeaderProps {
    title: string;
    description?: string;
}

export function PageHeader({ title, description }: PageHeaderProps) {
    return (
        <div className="mb-6 sm:mb-8">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-primary font-headline">
                {title}
            </h1>
            {description && (
                <p className="mt-3 sm:mt-4 text-base sm:text-lg text-muted-foreground max-w-3xl hidden sm:block">
                    {description}
                </p>
            )}
        </div>
    )
}
