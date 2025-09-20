import ContactPersonsTable from "@/components/contact-persons-table";
import { ContactPersonsProvider } from "@/contexts/ContactPersonsContext";

export default function ContactPersons() {
  return (
    <ContactPersonsProvider>
      <ContactPersonsTable />
    </ContactPersonsProvider>
  );
}