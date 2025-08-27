import { X, ArrowRight, FileText, Users, Package, BarChart3 } from "lucide-react";

interface SectionInfoPanelProps {
  sectionId: string;
  sectionName: string;
  onClose: () => void;
}

export default function SectionInfoPanel({ sectionId, sectionName, onClose }: SectionInfoPanelProps) {
  const getSectionContent = () => {
    switch (sectionId) {
      case "overview":
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <BarChart3 className="h-8 w-8 text-orange-500" />
              <h2 className="text-2xl font-bold">Dashboard Overzicht</h2>
            </div>
            
            <div className="bg-orange-50 rounded-lg p-6 border border-orange-200">
              <h3 className="text-lg font-semibold mb-3 text-orange-800">Wat is het Dashboard?</h3>
              <p className="text-gray-700 mb-4">
                Het dashboard geeft je een compleet overzicht van je bedrijfsactiviteiten. 
                Hier zie je in één oogopslag de belangrijkste cijfers en trends.
              </p>
              
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="bg-white rounded-lg p-4 border">
                  <h4 className="font-semibold text-gray-800">Omzet Tracking</h4>
                  <p className="text-sm text-gray-600">Volg je verkopen en inkomsten</p>
                </div>
                <div className="bg-white rounded-lg p-4 border">
                  <h4 className="font-semibold text-gray-800">Actieve Projecten</h4>
                  <p className="text-sm text-gray-600">Beheer lopende projecten</p>
                </div>
                <div className="bg-white rounded-lg p-4 border">
                  <h4 className="font-semibold text-gray-800">Voorraad Status</h4>
                  <p className="text-sm text-gray-600">Monitor je inventory levels</p>
                </div>
                <div className="bg-white rounded-lg p-4 border">
                  <h4 className="font-semibold text-gray-800">Klant Activiteit</h4>
                  <p className="text-sm text-gray-600">Recente klant interacties</p>
                </div>
              </div>
            </div>
          </div>
        );

      case "relaties":
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <Users className="h-8 w-8 text-orange-500" />
              <h2 className="text-2xl font-bold">Relatiebeheer</h2>
            </div>
            
            <div className="bg-orange-50 rounded-lg p-6 border border-orange-200">
              <h3 className="text-lg font-semibold mb-3 text-orange-800">Centraal Relatiebeheer</h3>
              <p className="text-gray-700 mb-4">
                Beheer al je zakelijke relaties op één plek. Van klanten tot leveranciers, 
                houd alles georganiseerd en toegankelijk.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="font-medium">Klanten</span>
                  <span className="text-gray-500">- Je belangrijkste contacten en hun gegevens</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="font-medium">Leveranciers</span>
                  <span className="text-gray-500">- Betrouwbare partners voor je inkoop</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span className="font-medium">Contactpersonen</span>
                  <span className="text-gray-500">- Specifieke personen binnen organisaties</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span className="font-medium">Prospects</span>
                  <span className="text-gray-500">- Potentiële nieuwe klanten</span>
                </div>
              </div>
            </div>
          </div>
        );

      case "inventory":
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <Package className="h-8 w-8 text-orange-500" />
              <h2 className="text-2xl font-bold">Voorraad & Inkoop</h2>
            </div>
            
            <div className="bg-orange-50 rounded-lg p-6 border border-orange-200">
              <h3 className="text-lg font-semibold mb-3 text-orange-800">Slim Voorraadbeheer</h3>
              <p className="text-gray-700 mb-4">
                Houd je voorraad optimaal op peil en beheer je inkoop efficiënt. 
                Voorkom tekorten en overschotten met slimme tracking.
              </p>
              
              <div className="grid grid-cols-1 gap-4 mt-4">
                <div className="bg-white rounded-lg p-4 border flex items-center gap-4">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Package className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800">Stock Management</h4>
                    <p className="text-sm text-gray-600">Realtime voorraad levels en stock movements</p>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-4 border flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800">Purchase Orders</h4>
                    <p className="text-sm text-gray-600">Automatiseer je inkoop en bestellingen</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case "sales":
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <FileText className="h-8 w-8 text-orange-500" />
              <h2 className="text-2xl font-bold">Sales Proces</h2>
            </div>
            
            <div className="bg-orange-50 rounded-lg p-6 border border-orange-200">
              <h3 className="text-lg font-semibold mb-3 text-orange-800">Verkoop Flow</h3>
              <p className="text-gray-700 mb-6">
                Leid je prospect van eerste contact tot afgeleverde order met onze gestroomlijnde sales flow.
              </p>
              
              {/* Sales Flow Diagram */}
              <div className="bg-white rounded-lg p-6 border">
                <h4 className="font-semibold mb-4 text-center">Sales Proces Flow</h4>
                <div className="flex flex-col space-y-4">
                  
                  {/* Step 1 */}
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                    <div className="flex-1 bg-orange-100 rounded-lg p-3">
                      <h5 className="font-semibold text-orange-800">Quotation (Offerte)</h5>
                      <p className="text-sm text-gray-600">Start met een professionele offerte</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-center">
                    <ArrowRight className="h-5 w-5 text-gray-400" />
                  </div>
                  
                  {/* Step 2 */}
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                    <div className="flex-1 bg-blue-100 rounded-lg p-3">
                      <h5 className="font-semibold text-blue-800">Proforma Invoice</h5>
                      <p className="text-sm text-gray-600">Bevestig prijs en voorwaarden</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-center">
                    <ArrowRight className="h-5 w-5 text-gray-400" />
                  </div>
                  
                  {/* Step 3 */}
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
                    <div className="flex-1 bg-green-100 rounded-lg p-3">
                      <h5 className="font-semibold text-green-800">Sales Order</h5>
                      <p className="text-sm text-gray-600">Officiele bestelling vastleggen</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-center">
                    <ArrowRight className="h-5 w-5 text-gray-400" />
                  </div>
                  
                  {/* Step 4 */}
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold">4</div>
                    <div className="flex-1 bg-purple-100 rounded-lg p-3">
                      <h5 className="font-semibold text-purple-800">Order Confirmation</h5>
                      <p className="text-sm text-gray-600">Bevestig details en planning</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-center">
                    <ArrowRight className="h-5 w-5 text-gray-400" />
                  </div>
                  
                  {/* Step 5 */}
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 bg-yellow-500 text-white rounded-full flex items-center justify-center text-sm font-bold">5</div>
                    <div className="flex-1 bg-yellow-100 rounded-lg p-3">
                      <h5 className="font-semibold text-yellow-800">Project & Work Orders</h5>
                      <p className="text-sm text-gray-600">Plan en voer het werk uit</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-center">
                    <ArrowRight className="h-5 w-5 text-gray-400" />
                  </div>
                  
                  {/* Step 6 */}
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 bg-indigo-500 text-white rounded-full flex items-center justify-center text-sm font-bold">6</div>
                    <div className="flex-1 bg-indigo-100 rounded-lg p-3">
                      <h5 className="font-semibold text-indigo-800">Packing Lists</h5>
                      <p className="text-sm text-gray-600">Bereid verzending voor</p>
                    </div>
                  </div>
                  
                </div>
              </div>
            </div>
          </div>
        );

      case "operations":
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <Package className="h-8 w-8 text-orange-500" />
              <h2 className="text-2xl font-bold">Operationele Processen</h2>
            </div>
            
            <div className="bg-orange-50 rounded-lg p-6 border border-orange-200">
              <h3 className="text-lg font-semibold mb-3 text-orange-800">Dagelijkse Operaties</h3>
              <p className="text-gray-700 mb-4">
                Stroomlijn je dagelijkse bedrijfsvoering met geïntegreerde tools voor 
                facturatie, rapportage en administratie.
              </p>
              
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="bg-white rounded-lg p-4 border">
                  <h4 className="font-semibold text-gray-800">Facturatie</h4>
                  <p className="text-sm text-gray-600">Automatische invoice generatie</p>
                </div>
                <div className="bg-white rounded-lg p-4 border">
                  <h4 className="font-semibold text-gray-800">Rapportage</h4>
                  <p className="text-sm text-gray-600">Inzichtelijke business reports</p>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">{sectionName}</h2>
            <div className="bg-gray-50 rounded-lg p-6 border">
              <p className="text-gray-700">
                Selecteer een sectie om gedetailleerde informatie en hulp te bekijken.
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="h-full bg-white flex flex-col">
      {/* Header */}
      <div className="bg-orange-500 text-white p-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Sectie Informatie</h1>
        <button
          onClick={onClose}
          className="p-2 hover:bg-orange-600 rounded-lg transition-colors"
          data-testid="close-section-info"
        >
          <X size={20} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {getSectionContent()}
      </div>
    </div>
  );
}