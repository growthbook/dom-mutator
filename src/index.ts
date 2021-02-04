export type MutationType =
| "addClass"
| "removeClass"
| "appendHTML"
| "setHTML"
| "setAttribute";

export function mutate(selector: string, type: MutationType, value: string): () => void {
  // TODO: if element doesn't exist yet, wait for it
  // TODO: apply the mutation
  // TODO: add mutation observer to re-apply mutations if needed
  console.log(selector, type, value);

  return () => {
    // TODO: revert value back to previous
    // TODO: stop event listeners and observers
    console.log("revert");
  }
}
