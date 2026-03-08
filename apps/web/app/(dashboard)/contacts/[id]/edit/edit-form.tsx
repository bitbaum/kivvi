'use client';

import type { Contact } from '@kivvi/database';
import { ContactForm } from '@/components/contacts/contact-form';

interface EditContactFormProps {
  contact: Contact;
}

export function EditContactForm({ contact }: EditContactFormProps) {
  return <ContactForm mode="edit" contact={contact} />;
}
