import { render, screen, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DailyNutritionSummary } from "@/components/features/meal/DailyNutritionSummary";
import { mealApi } from "@/lib/api";
import dayjs from "dayjs";

vi.mock("@/lib/api", () => ({
  mealApi: {
    getByDate: vi.fn(),
  },
}));

const targetDate = dayjs("2024-06-15");
const mockMealsResponse = {
  meals: [
    {
      mealId: "m1",
      athleteId: "a1",
      date: "2024-06-15T08:00:00.000Z",
      mealType: "breakfast" as const,
      items: [
        {
          food: "Oatmeal",
          quantity: "1 cup",
          calories: 150,
          macros: { protein: 5, carbs: 27, fats: 3 },
        },
      ],
      createdAt: "",
      updatedAt: "",
    },
    {
      mealId: "m2",
      athleteId: "a1",
      date: "2024-06-15T13:00:00.000Z",
      mealType: "lunch" as const,
      items: [
        {
          food: "Chicken",
          quantity: "200g",
          calories: 330,
          macros: { protein: 62, carbs: 0, fats: 7 },
        },
      ],
      createdAt: "",
      updatedAt: "",
    },
  ],
  count: 2,
};

describe("DailyNutritionSummary", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  const renderWithProvider = (ui: React.ReactElement) =>
    render(
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
    );

  it("renders card with date in title", async () => {
    vi.mocked(mealApi.getByDate).mockResolvedValue({ meals: [], count: 0 });
    renderWithProvider(<DailyNutritionSummary date={targetDate} />);

    await waitFor(() => {
      expect(mealApi.getByDate).toHaveBeenCalled();
    });
    expect(screen.getByText(/nutrition summary/i)).toBeInTheDocument();
    expect(screen.getByText(/2024/)).toBeInTheDocument();
  });

  it("displays total calories for the day", async () => {
    vi.mocked(mealApi.getByDate).mockResolvedValue(mockMealsResponse);
    renderWithProvider(<DailyNutritionSummary date={targetDate} />);

    await waitFor(() => {
      expect(screen.getByText("480")).toBeInTheDocument();
    });
    expect(screen.getByText(/calories/i)).toBeInTheDocument();
  });

  it("displays macro breakdown (protein, carbs, fats)", async () => {
    vi.mocked(mealApi.getByDate).mockResolvedValue(mockMealsResponse);
    renderWithProvider(<DailyNutritionSummary date={targetDate} />);

    await waitFor(() => {
      expect(screen.getByText("67g")).toBeInTheDocument();
    });
    expect(screen.getByText(/protein/i)).toBeInTheDocument();
    expect(screen.getByText("27g")).toBeInTheDocument();
    expect(screen.getByText(/carbs/i)).toBeInTheDocument();
    expect(screen.getByText("10g")).toBeInTheDocument();
    expect(screen.getByText(/fats/i)).toBeInTheDocument();
  });

  it("shows zero totals when no meals for date", async () => {
    vi.mocked(mealApi.getByDate).mockResolvedValue({ meals: [], count: 0 });
    renderWithProvider(<DailyNutritionSummary date={targetDate} />);

    await waitFor(() => {
      expect(mealApi.getByDate).toHaveBeenCalled();
    });
    expect(screen.getByText("0")).toBeInTheDocument();
  });
});
