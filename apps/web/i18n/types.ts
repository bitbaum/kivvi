import messages from "../messages/de-CH.json";

type Messages = typeof messages;

declare module "next-intl" {
  interface IntlMessages extends Messages {}
}
