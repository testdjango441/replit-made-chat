import { useOpenApiSpec } from "@/hooks/use-openapi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

export function ApiSpecViewer() {
  const { data: spec, isLoading, error } = useOpenApiSpec();

  if (isLoading) return <div>Loading API spec...</div>;
  if (error) return <div>Error loading API spec: {error.message}</div>;
  if (!spec) return <div>No spec data</div>;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>API Specification</CardTitle>
        <p className="text-sm text-muted-foreground">
          {spec.info?.title} v{spec.info?.version}
        </p>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
          <div className="space-y-4">
            {spec.paths &&
              Object.entries(spec.paths).map(
                ([path, methods]: [string, any]) => (
                  <div key={path} className="border rounded-lg p-4">
                    <h3 className="font-semibold text-lg mb-2">{path}</h3>
                    <div className="space-y-2">
                      {Object.entries(methods).map(
                        ([method, details]: [string, any]) => (
                          <div key={method} className="flex items-start gap-2">
                            <Badge
                              variant="outline"
                              className="uppercase min-w-[60px] justify-center"
                            >
                              {method}
                            </Badge>
                            <div className="flex-1">
                              <p className="font-medium">
                                {details.summary || details.operationId}
                              </p>
                              {details.description && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {details.description}
                                </p>
                              )}
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                ),
              )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
