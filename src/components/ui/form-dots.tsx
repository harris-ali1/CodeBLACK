// Dotted divider from the ScrollX "contact-with-globe" component.
import * as React from "react";
import * as SeparatorPrimitive from "@radix-ui/react-separator";
import { cn } from "@/lib/utils";

export const FormDots = React.forwardRef<
  React.ComponentRef<typeof SeparatorPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>
>(({ className, orientation = "horizontal", decorative = true, ...props }, ref) => {
  const horizontal = orientation === "horizontal";
  return (
    <SeparatorPrimitive.Root
      ref={ref}
      decorative={decorative}
      orientation={orientation}
      className={cn("shrink-0 flex items-center justify-center overflow-hidden", horizontal ? "w-full" : "h-full", className)}
      {...props}
    >
      <div className={cn("relative", horizontal ? "w-full h-4" : "h-full w-4")}>
        <div
          className="absolute inset-0 bg-repeat text-white/20"
          style={{
            backgroundImage: "radial-gradient(circle, currentColor 0.8px, transparent 0.8px)",
            backgroundSize: horizontal ? "6px 100%" : "100% 6px",
            maskImage: horizontal
              ? "linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)"
              : "linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)",
          }}
        />
      </div>
    </SeparatorPrimitive.Root>
  );
});
FormDots.displayName = "FormDots";