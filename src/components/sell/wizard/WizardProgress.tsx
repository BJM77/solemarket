
import { cn } from "@/lib/utils/ui";
import { Check } from "lucide-react";

interface WizardProgressProps {
    currentStep: number;
    totalSteps: number;
    stepLabels: string[];
}

export function WizardProgress({ currentStep, totalSteps, stepLabels }: WizardProgressProps) {
    return (
        <div className="w-full">
            <div className="relative">
                <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-muted">
                    <div
                        style={{ width: `${((currentStep) / (totalSteps - 1)) * 100}%` }}
                        className="shadow-none flex flex-col text-center whitespace-nowrap text-primary-foreground justify-center bg-primary transition-all duration-500 ease-in-out"
                    />
                </div>

                <div className="flex justify-between text-xs sm:text-sm font-medium text-muted-foreground">
                    {stepLabels.map((label, index) => {
                        const isActive = index === currentStep;
                        const isCompleted = index < currentStep;

                        return (
                            <div
                                key={index}
                                className={cn(
                                    "flex items-center gap-1 transition-colors duration-300",
                                    isActive && "text-primary font-bold",
                                    isCompleted && "text-green-600"
                                )}
                            >
                                {isCompleted ? (
                                    <Check className="w-3 h-3 sm:w-4 sm:h-4" />
                                ) : (
                                    <span className={cn("w-3 h-3 sm:w-4 sm:h-4 rounded-full border flex items-center justify-center text-[10px]", isActive ? "border-primary bg-primary text-primary-foreground" : "border-border bg-muted/60 text-primary-foreground")}>
                                        {index + 1}
                                    </span>
                                )}
                                <span className={cn("hidden sm:inline", isActive && "inline")}>{label}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
