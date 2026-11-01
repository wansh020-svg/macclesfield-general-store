import DriverApp from "@/components/driver/DriverApp";
import DriverLogin from "@/components/driver/DriverLogin";
import { currentDriver } from "@/lib/auth";
import { driverBoard } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function DriverPage() {
  let driver = null;
  let board = null;
  try {
    driver = await currentDriver();
    if (driver) board = await driverBoard(driver.id);
  } catch (err) {
    console.error("Driver page:", err.message);
    return (
      <main className="max-w-md mx-auto px-5 py-16">
        <h1 className="font-display font-900 text-3xl">Can&apos;t load right now</h1>
        <p className="mt-3 text-canvas-light/70">The system is having trouble. Call the store and try again in a minute.</p>
      </main>
    );
  }
  return driver ? <DriverApp driver={driver} initialBoard={board} /> : <DriverLogin />;
}
