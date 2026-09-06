import { redirect } from "next/navigation";
import { HOME } from "../_navigation";

export default function Home() {
  redirect(HOME);
}
