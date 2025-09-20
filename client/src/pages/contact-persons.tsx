import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ContactPersons() {
  const { data: contacts = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/customer-contacts'],
  });

  if (isLoading) {
    return <div className="p-6">Loading contact persons...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Contact Persons</h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Contact Persons List</CardTitle>
        </CardHeader>
        <CardContent>
          {contacts.length === 0 ? (
            <p>No contact persons found.</p>
          ) : (
            <div className="space-y-4">
              {contacts.map((contact: any) => (
                <div key={contact.id} className="border rounded-lg p-4">
                  <h3 className="font-semibold">
                    {contact.firstName} {contact.lastName}
                  </h3>
                  <p className="text-sm text-gray-600">{contact.email}</p>
                  <p className="text-sm text-gray-600">{contact.phone}</p>
                  <p className="text-sm text-gray-600">{contact.position}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}