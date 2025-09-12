import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCustomerSchema } from "@shared/schema";
import { FormTabLayout } from "./FormTabLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, X } from "lucide-react";
import { z } from "zod";

const customerFormSchema = insertCustomerSchema.omit({ id: true }).extend({
  name: z.string().min(1, "Company name is required"),
  email: z.string().optional(),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  language: z.string().optional(),
  paymentTerms: z.string().min(1, "Payment terms is required"),
  // Address fields (will create address separately)
  street: z.string().optional(),
  houseNumber: z.string().optional(),
  postalCode: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
});

type CustomerFormData = z.infer<typeof customerFormSchema>;

interface CustomerFormLayoutProps {
  customerId?: string;
  initialData?: any;
  onSave: (data: CustomerFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function CustomerFormLayout({
  customerId,
  initialData,
  onSave,
  onCancel,
  isLoading = false
}: CustomerFormLayoutProps) {
  const [activeTab, setActiveTab] = useState("general");

  const customerForm = useForm<CustomerFormData>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      name: initialData?.name || "",
      email: initialData?.email || "",
      phone: initialData?.phone || "",
      mobile: initialData?.mobile || "",
      language: initialData?.language || "nl",
      paymentTerms: initialData?.paymentTerms?.toString() || "30",
      street: initialData?.street || "",
      houseNumber: initialData?.houseNumber || "",
      postalCode: initialData?.postalCode || "",
      city: initialData?.city || "",
      country: initialData?.country || "Nederland",
      taxId: initialData?.taxId || "",
      bankAccount: initialData?.bankAccount || "",
      contactPersonEmail: initialData?.contactPersonEmail || "",
    },
  });

  const handleSaveCustomer = (data: CustomerFormData) => {
    onSave(data);
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {customerId ? "Edit Customer" : "New Customer"}
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              {customerId ? `Customer ID: ${customerId}` : "Create a new customer"}
            </p>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={onCancel}
              className="h-8 text-xs"
              data-testid="button-cancel-customer"
            >
              <X size={14} className="mr-1" />
              Cancel
            </Button>
            <Button 
              size="sm"
              onClick={customerForm.handleSubmit(handleSaveCustomer)}
              className="h-8 text-xs bg-green-600 text-white hover:bg-green-700"
              disabled={isLoading}
              data-testid="button-save-customer"
            >
              <Save size={14} className="mr-1" />
              {isLoading ? "Saving..." : "Save Customer"}
            </Button>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="flex-1 overflow-hidden">
        <Card className="border-0 shadow-none ml-2 mr-2 mt-2 h-full">
          <CardContent className="p-0 h-full">
            <FormTabLayout
              activeTab={activeTab}
              onTabChange={setActiveTab}
              tabs={[
                {
                  id: "general",
                  label: "General",
                  content: (
                    <div className="space-y-6">
                      {/* Company Information */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900">Company Information</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="name">Company Name *</Label>
                            <Input
                              id="name"
                              {...customerForm.register("name")}
                              data-testid="input-customer-name"
                            />
                            {customerForm.formState.errors.name && (
                              <p className="text-sm text-red-600">{customerForm.formState.errors.name.message}</p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="language">Language</Label>
                            <Select 
                              onValueChange={(value) => customerForm.setValue("language", value)}
                              value={customerForm.watch("language") || "nl"}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="nl">Nederlands</SelectItem>
                                <SelectItem value="en">English</SelectItem>
                                <SelectItem value="de">Deutsch</SelectItem>
                                <SelectItem value="fr">Français</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>

                      {/* Contact Information */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900">Contact Information</h3>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                              id="email"
                              type="email"
                              {...customerForm.register("email")}
                              data-testid="input-customer-email"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="phone">Phone</Label>
                            <Input
                              id="phone"
                              {...customerForm.register("phone")}
                              data-testid="input-customer-phone"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="mobile">Mobile</Label>
                            <Input
                              id="mobile"
                              {...customerForm.register("mobile")}
                              data-testid="input-customer-mobile"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                },
                {
                  id: "address",
                  label: "Address",
                  content: (
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold text-gray-900">Address Information</h3>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2 space-y-2">
                          <Label htmlFor="street">Street</Label>
                          <Input
                            id="street"
                            {...customerForm.register("street")}
                            data-testid="input-customer-street"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="houseNumber">House No.</Label>
                          <Input
                            id="houseNumber"
                            {...customerForm.register("houseNumber")}
                            data-testid="input-customer-house-number"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="postalCode">Postal Code</Label>
                          <Input
                            id="postalCode"
                            {...customerForm.register("postalCode")}
                            data-testid="input-customer-postal-code"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="city">City</Label>
                          <Input
                            id="city"
                            {...customerForm.register("city")}
                            data-testid="input-customer-city"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="country">Country</Label>
                          <Input
                            id="country"
                            {...customerForm.register("country")}
                            data-testid="input-customer-country"
                          />
                        </div>
                      </div>
                    </div>
                  )
                },
                {
                  id: "finance",
                  label: "Finance",
                  content: (
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold text-gray-900">Financial Information</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="paymentTerms">Payment Terms *</Label>
                          <Select 
                            onValueChange={(value) => customerForm.setValue("paymentTerms", value)}
                            value={customerForm.watch("paymentTerms") || "30"}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="7">7 days</SelectItem>
                              <SelectItem value="14">14 days</SelectItem>
                              <SelectItem value="30">30 days</SelectItem>
                              <SelectItem value="45">45 days</SelectItem>
                              <SelectItem value="60">60 days</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="taxId">VAT Number</Label>
                          <Input
                            id="taxId"
                            {...customerForm.register("taxId")}
                            placeholder="e.g. NL123456789B01"
                            data-testid="input-customer-tax-id"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="bankAccount">Bank Account</Label>
                        <Input
                          id="bankAccount"
                          {...customerForm.register("bankAccount")}
                          placeholder="e.g. NL12ABCD0123456789"
                          data-testid="input-customer-bank-account"
                        />
                      </div>
                    </div>
                  )
                },
                {
                  id: "contacts",
                  label: "Contacts",
                  content: (
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold text-gray-900">Contact Persons</h3>
                      <div className="space-y-2">
                        <Label htmlFor="contactPersonEmail">Primary Contact Email</Label>
                        <Input
                          id="contactPersonEmail"
                          type="email"
                          {...customerForm.register("contactPersonEmail")}
                          data-testid="input-customer-contact-email"
                        />
                      </div>
                      
                      {/* Future: Here we can add a table for multiple contact persons */}
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-600">
                          Multiple contact persons functionality will be added in a future update.
                        </p>
                      </div>
                    </div>
                  )
                }
              ]}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}