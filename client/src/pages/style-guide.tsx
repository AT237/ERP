import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, Copy, Check, ExternalLink } from "lucide-react";

export default function StyleGuidePage() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyToClipboard = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="border-b bg-white dark:bg-gray-800">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <span>Tools</span>
            <span>/</span>
            <span className="text-foreground">Design System</span>
          </div>
          <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">Design System</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400 max-w-3xl">
            Documentation of standard components, layout patterns and design guidelines for consistent forms and interfaces.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <Tabs defaultValue="form-layout" className="space-y-8">
          <TabsList className="bg-white dark:bg-gray-800 border p-1">
            <TabsTrigger value="form-layout">Form Layout</TabsTrigger>
            <TabsTrigger value="field-types">Field Types</TabsTrigger>
            <TabsTrigger value="select-add">Select with Add</TabsTrigger>
            <TabsTrigger value="tables">Table Styles</TabsTrigger>
            <TabsTrigger value="spacing">Spacing & Sizing</TabsTrigger>
          </TabsList>

          <TabsContent value="form-layout" className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Standaard Formulier Layout</CardTitle>
                <CardDescription>
                  Twee-kolom layout met automatische veldverdeling. Kleine velden links, grote velden rechts.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-6">
                  <div className="grid grid-cols-2 gap-8">
                    <div className="flex flex-col gap-[20px]">
                      <div className="grid grid-cols-[130px_1fr] items-center gap-3">
                        <Label className="text-right text-sm">Veld Label</Label>
                        <Input placeholder="Tekst invoer" className="h-10" />
                      </div>
                      <div className="grid grid-cols-[130px_1fr] items-center gap-3">
                        <Label className="text-right text-sm">Nummer</Label>
                        <Input type="number" placeholder="0" className="h-10" />
                      </div>
                      <div className="grid grid-cols-[130px_1fr] items-center gap-3">
                        <Label className="text-right text-sm">Selectie</Label>
                        <Select>
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Kies optie..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">Optie 1</SelectItem>
                            <SelectItem value="2">Optie 2</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex flex-col gap-[20px]">
                      <div className="grid grid-cols-[130px_1fr] items-start gap-3">
                        <Label className="text-right text-sm pt-2">Beschrijving</Label>
                        <Textarea placeholder="Lange tekst..." className="min-h-[100px]" />
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium">Specificaties</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-gray-800 border rounded-lg p-4">
                      <div className="text-sm text-muted-foreground mb-1">Label Breedte</div>
                      <div className="font-mono text-lg">130px</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 border rounded-lg p-4">
                      <div className="text-sm text-muted-foreground mb-1">Kolom Gap</div>
                      <div className="font-mono text-lg">32px <span className="text-muted-foreground text-sm">(gap-8)</span></div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 border rounded-lg p-4">
                      <div className="text-sm text-muted-foreground mb-1">Rij Gap</div>
                      <div className="font-mono text-lg">20px <span className="text-muted-foreground text-sm">(gap-[20px])</span></div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 border rounded-lg p-4">
                      <div className="text-sm text-muted-foreground mb-1">Label-Veld Gap</div>
                      <div className="font-mono text-lg">12px <span className="text-muted-foreground text-sm">(gap-3)</span></div>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Code Voorbeeld</h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(`const formSections: FormSection2<FormData>[] = [
  {
    id: 'general',
    label: 'Algemeen',
    rows: [
      createFieldRow(formFields[0]), // text → links
      createFieldRow(formFields[1]), // select → links
      createFieldRow(formFields[2]), // textarea → rechts
    ]
  }
];`, 'form-layout')}
                    >
                      {copiedCode === 'form-layout' ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                      {copiedCode === 'form-layout' ? 'Gekopieerd' : 'Kopieer'}
                    </Button>
                  </div>
                  <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm">
{`const formSections: FormSection2<FormData>[] = [
  {
    id: 'general',
    label: 'Algemeen',
    rows: [
      createFieldRow(formFields[0]), // text → links
      createFieldRow(formFields[1]), // select → links  
      createFieldRow(formFields[2]), // textarea → rechts
    ]
  }
];`}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="field-types" className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Standaard Veld Types</CardTitle>
                <CardDescription>
                  Overzicht van alle beschikbare veldtypes met hun standaard afmetingen.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-[200px_1fr_150px] items-center gap-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
                    <div>
                      <div className="font-medium">Text Input</div>
                      <div className="text-sm text-muted-foreground">type: 'text'</div>
                    </div>
                    <Input placeholder="Voorbeeld tekst" className="h-10" />
                    <Badge variant="outline" className="justify-center">h-10 (40px)</Badge>
                  </div>

                  <div className="grid grid-cols-[200px_1fr_150px] items-center gap-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
                    <div>
                      <div className="font-medium">Number Input</div>
                      <div className="text-sm text-muted-foreground">type: 'number'</div>
                    </div>
                    <Input type="number" placeholder="0" className="h-10" />
                    <Badge variant="outline" className="justify-center">h-10 (40px)</Badge>
                  </div>

                  <div className="grid grid-cols-[200px_1fr_150px] items-center gap-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
                    <div>
                      <div className="font-medium">Date Input</div>
                      <div className="text-sm text-muted-foreground">type: 'date'</div>
                    </div>
                    <Input type="date" className="h-10" />
                    <Badge variant="outline" className="justify-center">h-10 (40px)</Badge>
                  </div>

                  <div className="grid grid-cols-[200px_1fr_150px] items-center gap-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
                    <div>
                      <div className="font-medium">Select</div>
                      <div className="text-sm text-muted-foreground">type: 'select'</div>
                    </div>
                    <Select>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Selecteer..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Optie 1</SelectItem>
                        <SelectItem value="2">Optie 2</SelectItem>
                      </SelectContent>
                    </Select>
                    <Badge variant="outline" className="justify-center">h-10 (40px)</Badge>
                  </div>

                  <div className="grid grid-cols-[200px_1fr_150px] items-start gap-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
                    <div>
                      <div className="font-medium">Textarea</div>
                      <div className="text-sm text-muted-foreground">type: 'textarea'</div>
                    </div>
                    <Textarea placeholder="Lange tekst invoer..." className="min-h-[100px]" />
                    <Badge variant="outline" className="justify-center">min-h-[100px]</Badge>
                  </div>
                </div>

                <Separator />

                <div className="bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                  <h4 className="font-medium text-orange-800 dark:text-orange-200 mb-2">Textarea Hoogte Berekening</h4>
                  <p className="text-sm text-orange-700 dark:text-orange-300">
                    100px = 2 × veld hoogte (40px) + 1 × rij gap (20px)
                  </p>
                  <p className="text-sm text-orange-600 dark:text-orange-400 mt-1">
                    Dit zorgt ervoor dat een textarea exact 2 normale velden hoog is.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="select-add" className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Select met Toevoegen Knop</CardTitle>
                <CardDescription>
                  Patroon voor selectievelden waar gebruikers direct nieuwe items kunnen toevoegen.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-6">
                  <div className="grid grid-cols-[130px_1fr] items-center gap-3">
                    <Label className="text-right text-sm">Klant</Label>
                    <div className="flex gap-2">
                      <Select>
                        <SelectTrigger className="h-10 flex-1">
                          <SelectValue placeholder="Selecteer klant..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">DEB-001 - Acme Corp</SelectItem>
                          <SelectItem value="2">DEB-002 - TechStart BV</SelectItem>
                          <SelectItem value="3">DEB-003 - Global Industries</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="outline" size="icon" className="h-10 w-10 shrink-0">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium">Gedrag</h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <Badge variant="secondary" className="mt-0.5">1</Badge>
                      <span>Gebruiker klikt op de <strong>+</strong> knop naast het selectieveld</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Badge variant="secondary" className="mt-0.5">2</Badge>
                      <span>Een modal/dialog opent met het formulier voor het nieuwe item</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Badge variant="secondary" className="mt-0.5">3</Badge>
                      <span>Na opslaan wordt het nieuwe item automatisch geselecteerd</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Badge variant="secondary" className="mt-0.5">4</Badge>
                      <span>De dropdown lijst wordt ververst met het nieuwe item</span>
                    </li>
                  </ul>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Code Voorbeeld</h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(`<div className="flex gap-2">
  <Select value={value} onValueChange={setValue}>
    <SelectTrigger className="h-10 flex-1">
      <SelectValue placeholder="Selecteer..." />
    </SelectTrigger>
    <SelectContent>
      {items.map(item => (
        <SelectItem key={item.id} value={item.id}>
          {item.name}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
  <Button 
    variant="outline" 
    size="icon" 
    className="h-10 w-10"
    onClick={() => setShowAddDialog(true)}
  >
    <Plus className="h-4 w-4" />
  </Button>
</div>`, 'select-add')}
                    >
                      {copiedCode === 'select-add' ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                      {copiedCode === 'select-add' ? 'Gekopieerd' : 'Kopieer'}
                    </Button>
                  </div>
                  <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm">
{`<div className="flex gap-2">
  <Select value={value} onValueChange={setValue}>
    <SelectTrigger className="h-10 flex-1">
      <SelectValue placeholder="Selecteer..." />
    </SelectTrigger>
    <SelectContent>
      {items.map(item => (
        <SelectItem key={item.id} value={item.id}>
          {item.name}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
  <Button 
    variant="outline" 
    size="icon" 
    className="h-10 w-10"
    onClick={() => setShowAddDialog(true)}
  >
    <Plus className="h-4 w-4" />
  </Button>
</div>`}
                  </pre>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ExternalLink className="h-4 w-4" />
                  <span>Referentie: </span>
                  <a 
                    href="https://atlassian.design/components/select/creatable-select" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-orange-600 hover:underline"
                  >
                    Atlassian Creatable Select
                  </a>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tables" className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Tabel Kolom Stijlen</CardTitle>
                <CardDescription>
                  Standaard stijlen voor tabelkolommen met helper functies.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-100 dark:bg-gray-800">
                        <th className="border p-3 text-left text-sm font-medium">Kolom Type</th>
                        <th className="border p-3 text-left text-sm font-medium">Helper Functie</th>
                        <th className="border p-3 text-left text-sm font-medium">Stijl</th>
                        <th className="border p-3 text-left text-sm font-medium">Breedte</th>
                        <th className="border p-3 text-left text-sm font-medium">Voorbeeld</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border p-3">Positie</td>
                        <td className="border p-3"><code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-sm">createPositionColumn()</code></td>
                        <td className="border p-3">font-mono text-xs</td>
                        <td className="border p-3">70px</td>
                        <td className="border p-3"><span className="font-mono text-xs">010</span></td>
                      </tr>
                      <tr>
                        <td className="border p-3">ID/Code</td>
                        <td className="border p-3"><code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-sm">createIdColumn()</code></td>
                        <td className="border p-3">font-mono text-xs</td>
                        <td className="border p-3">120px</td>
                        <td className="border p-3"><span className="font-mono text-xs">Q-2025-001</span></td>
                      </tr>
                      <tr>
                        <td className="border p-3">Bedrag</td>
                        <td className="border p-3"><code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-sm">createCurrencyColumn()</code></td>
                        <td className="border p-3">text-right, € prefix</td>
                        <td className="border p-3">120px</td>
                        <td className="border p-3 text-right">€ 1.250,00</td>
                      </tr>
                      <tr>
                        <td className="border p-3">Numeriek</td>
                        <td className="border p-3"><code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-sm">createNumericColumn()</code></td>
                        <td className="border p-3">text-right</td>
                        <td className="border p-3">100px</td>
                        <td className="border p-3 text-right">42</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <Separator />

                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Kolom Volgorde Conventie</h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    checkbox → positie → ID → beschrijving → numerieke waarden → acties
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="spacing" className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Spacing & Sizing Referentie</CardTitle>
                <CardDescription>
                  Alle standaard afmetingen en spacing waarden voor consistente layouts.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium">Veld Hoogtes</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-800 rounded">
                        <span>Input / Select</span>
                        <div className="flex items-center gap-2">
                          <code className="bg-white dark:bg-gray-700 px-2 py-1 rounded text-sm">h-10</code>
                          <span className="text-muted-foreground">=</span>
                          <Badge>40px</Badge>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-800 rounded">
                        <span>Textarea (min)</span>
                        <div className="flex items-center gap-2">
                          <code className="bg-white dark:bg-gray-700 px-2 py-1 rounded text-sm">min-h-[100px]</code>
                          <span className="text-muted-foreground">=</span>
                          <Badge>100px</Badge>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-800 rounded">
                        <span>Button (icon)</span>
                        <div className="flex items-center gap-2">
                          <code className="bg-white dark:bg-gray-700 px-2 py-1 rounded text-sm">h-10 w-10</code>
                          <span className="text-muted-foreground">=</span>
                          <Badge>40×40px</Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium">Spacing</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-800 rounded">
                        <span>Rij Gap (verticaal)</span>
                        <div className="flex items-center gap-2">
                          <code className="bg-white dark:bg-gray-700 px-2 py-1 rounded text-sm">gap-[20px]</code>
                          <span className="text-muted-foreground">=</span>
                          <Badge>20px</Badge>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-800 rounded">
                        <span>Kolom Gap (horizontaal)</span>
                        <div className="flex items-center gap-2">
                          <code className="bg-white dark:bg-gray-700 px-2 py-1 rounded text-sm">gap-8</code>
                          <span className="text-muted-foreground">=</span>
                          <Badge>32px</Badge>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-800 rounded">
                        <span>Label-Veld Gap</span>
                        <div className="flex items-center gap-2">
                          <code className="bg-white dark:bg-gray-700 px-2 py-1 rounded text-sm">gap-3</code>
                          <span className="text-muted-foreground">=</span>
                          <Badge>12px</Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium">Breedtes</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-800 rounded">
                        <span>Label Kolom</span>
                        <Badge>130px</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-800 rounded">
                        <span>Positie Kolom</span>
                        <Badge>70px</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-800 rounded">
                        <span>ID Kolom</span>
                        <Badge>120px</Badge>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium">Grid Template</h4>
                    <div className="space-y-2">
                      <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded">
                        <div className="text-sm text-muted-foreground mb-1">Form Row</div>
                        <code className="text-sm">grid-cols-[130px_1fr]</code>
                      </div>
                      <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded">
                        <div className="text-sm text-muted-foreground mb-1">Two Column</div>
                        <code className="text-sm">grid-cols-2 gap-8</code>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
