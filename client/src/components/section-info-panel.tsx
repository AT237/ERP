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
              <h2 className="text-2xl font-bold">Dashboard Overview</h2>
            </div>
            
            <div className="bg-orange-50 rounded-lg p-6 border border-orange-200">
              <h3 className="text-lg font-semibold mb-3 text-orange-800">What is the Dashboard?</h3>
              <p className="text-gray-700 mb-4">
                The dashboard provides a complete overview of your business activities. 
                Here you can see the most important metrics and trends at a glance.
              </p>
              
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="bg-white rounded-lg p-4 border">
                  <h4 className="font-semibold text-gray-800">Revenue Tracking</h4>
                  <p className="text-sm text-gray-600">Track your sales and income</p>
                </div>
                <div className="bg-white rounded-lg p-4 border">
                  <h4 className="font-semibold text-gray-800">Active Projects</h4>
                  <p className="text-sm text-gray-600">Manage ongoing projects</p>
                </div>
                <div className="bg-white rounded-lg p-4 border">
                  <h4 className="font-semibold text-gray-800">Inventory Status</h4>
                  <p className="text-sm text-gray-600">Monitor your stock levels</p>
                </div>
                <div className="bg-white rounded-lg p-4 border">
                  <h4 className="font-semibold text-gray-800">Customer Activity</h4>
                  <p className="text-sm text-gray-600">Recent customer interactions</p>
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
              <h2 className="text-2xl font-bold">Relationship Management</h2>
            </div>
            
            <div className="bg-orange-50 rounded-lg p-6 border border-orange-200">
              <h3 className="text-lg font-semibold mb-3 text-orange-800">Central Relationship Management</h3>
              <p className="text-gray-700 mb-4">
                Manage all your business relationships in one place. From customers to suppliers, 
                keep everything organized and accessible.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="font-medium">Customers</span>
                  <span className="text-gray-500">- Your most important contacts and their details</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="font-medium">Suppliers</span>
                  <span className="text-gray-500">- Reliable partners for your procurement</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span className="font-medium">Contact Persons</span>
                  <span className="text-gray-500">- Specific individuals within organizations</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span className="font-medium">Prospects</span>
                  <span className="text-gray-500">- Potential new customers</span>
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
              <h2 className="text-2xl font-bold">Inventory & Procurement</h2>
            </div>
            
            <div className="bg-orange-50 rounded-lg p-6 border border-orange-200">
              <h3 className="text-lg font-semibold mb-3 text-orange-800">Smart Inventory Management</h3>
              <p className="text-gray-700 mb-4">
                Keep your inventory optimally stocked and manage procurement efficiently. 
                Prevent shortages and surpluses with smart tracking.
              </p>
              
              <div className="grid grid-cols-1 gap-4 mt-4">
                <div className="bg-white rounded-lg p-4 border flex items-center gap-4">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Package className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800">Stock Management</h4>
                    <p className="text-sm text-gray-600">Real-time inventory levels and stock movements</p>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-4 border flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800">Purchase Orders</h4>
                    <p className="text-sm text-gray-600">Automate your procurement and ordering</p>
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
              <h2 className="text-2xl font-bold">Sales Process</h2>
            </div>
            
            <div className="bg-orange-50 rounded-lg p-6 border border-orange-200">
              <h3 className="text-lg font-semibold mb-3 text-orange-800">Sales Flow</h3>
              <p className="text-gray-700 mb-6">
                Guide your prospect from first contact to delivered order with our streamlined sales flow.
              </p>
              
              {/* Sales Flow Diagram */}
              <div className="bg-white rounded-lg p-6 border">
                <h4 className="font-semibold mb-4 text-center">Sales Process Flow</h4>
                <div className="flex flex-col space-y-4">
                  
                  {/* Step 1 */}
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                    <div className="flex-1 bg-orange-100 rounded-lg p-3">
                      <h5 className="font-semibold text-orange-800">Quotation</h5>
                      <p className="text-sm text-gray-600">Start with a professional quote</p>
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
                      <p className="text-sm text-gray-600">Confirm price and conditions</p>
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
                      <p className="text-sm text-gray-600">Record official order</p>
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
                      <p className="text-sm text-gray-600">Confirm details and planning</p>
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
                      <p className="text-sm text-gray-600">Plan and execute the work</p>
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
                      <p className="text-sm text-gray-600">Prepare shipment</p>
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
              <h2 className="text-2xl font-bold">Operational Processes</h2>
            </div>
            
            <div className="bg-orange-50 rounded-lg p-6 border border-orange-200">
              <h3 className="text-lg font-semibold mb-3 text-orange-800">Daily Operations</h3>
              <p className="text-gray-700 mb-4">
                Streamline your daily business operations with integrated tools for 
                invoicing, reporting and administration.
              </p>
              
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="bg-white rounded-lg p-4 border">
                  <h4 className="font-semibold text-gray-800">Invoicing</h4>
                  <p className="text-sm text-gray-600">Automatic invoice generation</p>
                </div>
                <div className="bg-white rounded-lg p-4 border">
                  <h4 className="font-semibold text-gray-800">Reporting</h4>
                  <p className="text-sm text-gray-600">Insightful business reports</p>
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
                Select a section to view detailed information and help.
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
        <h1 className="text-xl font-bold">Section Information</h1>
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