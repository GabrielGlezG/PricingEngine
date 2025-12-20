import { BrandLogo } from "./BrandLogo";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface BrandHeaderProps {
  brands: string[];
  tipoVehiculo?: string[];
  models?: string[];
  className?: string;
}

export function BrandHeader({ brands, tipoVehiculo, models, className }: BrandHeaderProps) {
  if (brands.length === 0) return null;

  const isSingleBrand = brands.length === 1;

  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl p-6 md:p-8 bg-gradient-to-br from-background/95 via-primary/5 to-background/95 backdrop-blur-xl border border-primary/20 shadow-lg shadow-primary/5 hover:shadow-primary/10 hover:border-primary/30 transition-all duration-300",
      className
    )}>
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-primary/20 to-blue-500/10 rounded-full blur-3xl -translate-y-1/3 translate-x-1/4 opacity-60" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-primary/20 to-blue-400/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4 opacity-60" />
      
      <div className="relative z-10">
        {isSingleBrand ? (
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <BrandLogo brand={brands[0]} size="2xl" showName={false} />
            <div className="space-y-2">
              <p className="label-text">Marca seleccionada</p>
              <h1 className="display-text text-foreground">{brands[0]}</h1>
              <div className="flex flex-wrap gap-2 mt-3">
                {tipoVehiculo && tipoVehiculo.length > 0 && (
                  tipoVehiculo.map(tipo => (
                    <Badge key={tipo} variant="secondary" className="text-xs font-medium">
                      {tipo}
                    </Badge>
                  ))
                )}
                {models && models.length > 0 && (
                  models.map(model => (
                    <Badge key={model} variant="outline" className="text-xs font-medium border-primary/30 text-primary">
                      {model}
                    </Badge>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="label-text">Marcas seleccionadas</p>
            <div className="flex flex-wrap items-center gap-4">
              {brands.map((brand) => (
                <BrandLogo key={brand} brand={brand} size="xl" />
              ))}
            </div>
            {(tipoVehiculo && tipoVehiculo.length > 0) || (models && models.length > 0) ? (
              <div className="flex flex-wrap gap-2 pt-2">
                {tipoVehiculo?.map(tipo => (
                  <Badge key={tipo} variant="secondary" className="text-xs font-medium">
                    {tipo}
                  </Badge>
                ))}
                {models?.map(model => (
                  <Badge key={model} variant="outline" className="text-xs font-medium border-primary/30 text-primary">
                    {model}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
