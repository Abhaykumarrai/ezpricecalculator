import { CostCalculator } from "@/components/CostCalculator";

export default function Home() {
  return (
    <>
      <header className="app-header">
        <div className="header-inner">
          <h1>Ezrecruit Cost Calculator</h1>
        </div>
      </header>
      <CostCalculator />
    </>
  );
}
