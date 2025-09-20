import ContactPersonsTable from "@/components/contact-persons-table";
import { ContactPersonsProvider } from "@/contexts/ContactPersonsContext";

export default function ContactPersons() {
  console.log('🔍 ContactPersons component rendered');
  
  return (
    <ContactPersonsProvider>
      <ContactPersonsTable />
    </ContactPersonsProvider>
  );
}