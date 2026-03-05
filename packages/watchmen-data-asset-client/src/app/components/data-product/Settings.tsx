import { useState } from "react";
import { ArrowLeft, Sun, Moon } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";

export function Settings() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  return (
    <div className="p-8 space-y-8">
      <div>
        <div className="flex items-center gap-4 mb-2">
          <Button variant="outline" size="icon" className="h-9 w-9">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-2xl font-semibold text-gray-900">Settings</h2>
        </div>
        <p className="text-gray-500 ml-14">Customize your application preferences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Customize how the application looks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Sun className="h-5 w-5 text-gray-500" />
              <div className="space-y-0.5">
                <Label className="text-base font-medium">Dark Mode</Label>
                <p className="text-sm text-gray-500">
                  {isDarkMode ? "Using dark theme" : "Using light theme"}
                </p>
              </div>
            </div>
            <Switch
              checked={isDarkMode}
              onCheckedChange={setIsDarkMode}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
