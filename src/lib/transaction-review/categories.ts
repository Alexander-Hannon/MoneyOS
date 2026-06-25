import { REVIEW_CATEGORIES, type ReviewCategory } from "@/types/transaction-review";
import type {
  TransactionCategory,
  TransactionClassification,
  TransactionType,
} from "@/types/transactions";

export function domainCategoryToReview(
  category: TransactionCategory | string,
): ReviewCategory {
  switch (category) {
    case "Food":
      return "Food / Dining";
    case "Gas":
      return "Gas / Transport";
    case "Fitness":
      return "Health / Fitness";
    case "Convenience / Shopping":
      return "Shopping";
    case "Business / Productivity":
    case "Tech":
      return "Business / Productivity";
    case "Bills":
      return "Utilities";
    case "Income":
      return "Income";
    case "Transfer":
      return "Transfer / Internal";
    case "Other":
      return "Other / Needs review";
    default:
      if (
        (REVIEW_CATEGORIES as readonly string[]).includes(category)
      ) {
        return category as ReviewCategory;
      }
      return "Other / Needs review";
  }
}

export function reviewCategoryToDomain(category: string): {
  category: TransactionCategory;
  userConfirmedCategory: string;
  classification: TransactionClassification;
  type: TransactionType;
} {
  switch (category) {
    case "Food / Dining":
    case "Groceries":
      return {
        category: "Food",
        userConfirmedCategory: category,
        classification: "spending",
        type: "debit",
      };
    case "Gas / Transport":
      return {
        category: "Gas",
        userConfirmedCategory: category,
        classification: "spending",
        type: "debit",
      };
    case "Housing":
    case "Utilities":
    case "Internet / Phone":
      return {
        category: "Bills",
        userConfirmedCategory: category,
        classification: "spending",
        type: "debit",
      };
    case "School":
    case "Entertainment":
    case "Travel":
    case "Gifts":
      return {
        category: "Other",
        userConfirmedCategory: category,
        classification: "spending",
        type: "debit",
      };
    case "Business / Productivity":
      return {
        category: "Business / Productivity",
        userConfirmedCategory: category,
        classification: "spending",
        type: "debit",
      };
    case "Shopping":
      return {
        category: "Convenience / Shopping",
        userConfirmedCategory: category,
        classification: "spending",
        type: "debit",
      };
    case "Health / Fitness":
      return {
        category: "Fitness",
        userConfirmedCategory: category,
        classification: "spending",
        type: "debit",
      };
    case "Income":
      return {
        category: "Income",
        userConfirmedCategory: category,
        classification: "income",
        type: "income",
      };
    case "Refund":
      return {
        category: "Other",
        userConfirmedCategory: category,
        classification: "refund",
        type: "credit",
      };
    case "Transfer / Internal":
      return {
        category: "Transfer",
        userConfirmedCategory: category,
        classification: "transfer",
        type: "transfer",
      };
    case "Credit Card Payment":
      return {
        category: "Bills",
        userConfirmedCategory: category,
        classification: "credit_card_payment",
        type: "payment",
      };
    default:
      return {
        category: "Review",
        userConfirmedCategory: category || "Other / Needs review",
        classification: "review",
        type: "debit",
      };
  }
}

export function billCategoryGuess(billName: string): ReviewCategory {
  const name = billName.toLowerCase();
  if (/fiber|internet|comcast|spectrum|att|verizon|phone|mobile/.test(name)) {
    return "Internet / Phone";
  }
  if (/electric|water|gas|utility|power/.test(name)) {
    return "Utilities";
  }
  if (/rent|mortgage|hoa|housing/.test(name)) {
    return "Housing";
  }
  return "Utilities";
}

export function subscriptionCategoryGuess(subscriptionName: string): ReviewCategory {
  const name = subscriptionName.toLowerCase();
  if (/cursor|notion|github|adobe|figma|saas|cloud/.test(name)) {
    return "Business / Productivity";
  }
  if (/netflix|hulu|spotify|disney|entertainment/.test(name)) {
    return "Entertainment";
  }
  if (/gym|fitness|peloton/.test(name)) {
    return "Health / Fitness";
  }
  return "Shopping";
}

export function reviewStateLabel(
  reviewState: string | undefined,
  meta?: {
    linkedBillName?: string | null;
    linkedSubscriptionName?: string | null;
  },
): string {
  switch (reviewState) {
    case "categorized":
      return "Categorized";
    case "linked_bill":
      return meta?.linkedBillName
        ? `Linked to bill: ${meta.linkedBillName}`
        : "Linked to bill";
    case "linked_subscription":
      return meta?.linkedSubscriptionName
        ? `Linked to subscription: ${meta.linkedSubscriptionName}`
        : "Linked to subscription";
    case "transfer":
      return "Transfer / Internal";
    case "refund":
      return "Refund";
    case "income":
      return "Income";
    case "ignored":
      return "Ignored";
    case "unresolved":
      return "Review later";
    default:
      return "Review";
  }
}
