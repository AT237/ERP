import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, MapPin, Star } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Address, CustomerAddress } from "@shared/schema";

interface CustomerAddressWithAddress extends CustomerAddress {
  address: Address | null;
}

interface CustomerAddressesTabProps {
  customerId: string;
}

export function CustomerAddressesTab({ customerId }: CustomerAddressesTabProps) {
  const { toast } = useToast();
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [label, setLabel] = useState<string>("");

  const { data: customerAddresses = [], isLoading, isError } = useQuery<CustomerAddressWithAddress[]>({
    queryKey: ["/api/customer-addresses", { customerId }],
    queryFn: async () => {
      const res = await fetch(`/api/customer-addresses?customerId=${customerId}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!customerId,
  });

  const { data: allAddresses = [] } = useQuery<Address[]>({
    queryKey: ["/api/addresses"],
  });

  const linkedAddressIds = customerAddresses.map(ca => ca.addressId);
  const availableAddresses = allAddresses.filter(a => !linkedAddressIds.includes(a.id));

  const addMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/customer-addresses", {
        customerId,
        addressId: selectedAddressId,
        label: label.trim() || null,
        isDefault: customerAddresses.length === 0,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer-addresses", { customerId }] });
      setSelectedAddressId("");
      setLabel("");
      toast({ title: "Adres gekoppeld" });
    },
    onError: () => {
      toast({ title: "Fout", description: "Kon adres niet koppelen", variant: "destructive" });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/customer-addresses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer-addresses", { customerId }] });
      toast({ title: "Adres ontkoppeld" });
    },
    onError: () => {
      toast({ title: "Fout", description: "Kon adres niet ontkoppelen", variant: "destructive" });
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PATCH", `/api/customer-addresses/${id}`, { isDefault: true });
      const others = customerAddresses.filter(ca => ca.id !== id && ca.isDefault);
      for (const ca of others) {
        await apiRequest("PATCH", `/api/customer-addresses/${ca.id}`, { isDefault: false });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer-addresses", { customerId }] });
      toast({ title: "Standaard adres ingesteld" });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer-addresses", { customerId }] });
      toast({ title: "Fout", description: "Kon standaard adres niet instellen", variant: "destructive" });
    },
  });

  const formatAddress = (addr: Address | null) => {
    if (!addr) return "—";
    const parts = [addr.street, addr.houseNumber, addr.postalCode, addr.city, addr.country].filter(Boolean);
    return parts.join(", ");
  };

  if (!customerId) {
    return (
      <div className="text-sm text-muted-foreground p-4">
        Sla de klant eerst op om adressen toe te voegen.
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-sm text-red-600 border border-red-200 rounded-lg p-4">
        Kon adressen niet laden. Probeer de pagina te vernieuwen.
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full max-w-2xl">
      <div className="space-y-2">
        {customerAddresses.length === 0 && !isLoading && (
          <div className="text-sm text-muted-foreground border rounded-lg p-4 text-center">
            Geen adressen gekoppeld. Voeg hieronder een adres toe.
          </div>
        )}
        {customerAddresses.map((ca) => (
          <div key={ca.id} className="flex items-center gap-3 border rounded-lg p-3 bg-white dark:bg-gray-900">
            <MapPin className="h-4 w-4 text-orange-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {ca.label && (
                  <span className="text-xs font-semibold bg-orange-100 text-orange-700 px-2 py-0.5 rounded">
                    {ca.label}
                  </span>
                )}
                {ca.isDefault && (
                  <span className="text-xs font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded flex items-center gap-1">
                    <Star className="h-3 w-3" /> Standaard
                  </span>
                )}
              </div>
              <div className="text-sm mt-1 truncate">{formatAddress(ca.address)}</div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {!ca.isDefault && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => setDefaultMutation.mutate(ca.id)}
                  disabled={setDefaultMutation.isPending}
                >
                  <Star className="h-3 w-3 mr-1" /> Standaard
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-red-600"
                onClick={() => removeMutation.mutate(ca.id)}
                disabled={removeMutation.isPending}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800 space-y-3">
        <div className="text-sm font-medium">Adres toevoegen</div>
        <div className="grid grid-cols-[1fr_150px_auto] gap-2 items-end">
          <div>
            <Label className="text-xs mb-1 block">Adres</Label>
            <Select value={selectedAddressId || "__none__"} onValueChange={(v) => setSelectedAddressId(v === "__none__" ? "" : v)}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Selecteer een adres..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Selecteer adres —</SelectItem>
                {availableAddresses.map((addr) => (
                  <SelectItem key={addr.id} value={addr.id}>
                    {formatAddress(addr)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs mb-1 block">Label</Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="bijv. Magazijn"
              className="h-9"
            />
          </div>
          <Button
            type="button"
            size="sm"
            className="h-9 bg-orange-500 hover:bg-orange-600 text-white"
            onClick={() => addMutation.mutate()}
            disabled={!selectedAddressId || addMutation.isPending}
          >
            <Plus className="h-4 w-4 mr-1" /> Toevoegen
          </Button>
        </div>
      </div>
    </div>
  );
}
