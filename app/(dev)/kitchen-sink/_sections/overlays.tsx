import { Button } from "@/components/forms";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/overlays";
import { Text } from "@/components/typography";
import { Case, Row, Section } from "../_components/section";
import { readSources } from "../_lib/source";
import s from "../_components/sink.module.css";

export async function OverlaysSection() {
  const sources = await readSources([
    "overlays/tooltip/tooltip.tsx",
    "overlays/dropdown-menu/dropdown-menu.tsx",
    "overlays/dialog/dialog.tsx",
  ]);

  return (
    <Section
      id="overlays"
      title="Overlays"
      blurb="Anything that renders above the page. All of them portal out of their parent, because a transform or an overflow anywhere above them is a bug no z-index reaches — and all of them sit on one shared elevated surface, so three of them cannot drift apart."
    >
      <Case
        title="Tooltip"
        note="never the only place the information exists"
        sources={[sources[0]]}
      >
        <Row label="sides">
          {(["top", "right", "bottom", "left"] as const).map((side) => (
            <Tooltip key={side}>
              <TooltipTrigger asChild>
                <Button size="sm">{side}</Button>
              </TooltipTrigger>
              <TooltipContent side={side}>Opens {side}</TooltipContent>
            </Tooltip>
          ))}
        </Row>
        <Row label="additive">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" intent="ghost">Coverage</Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <span className={s.tipName}>Coverage</span>
              <span className={s.tipSub}>
                What has never been looked at. A filled cell is a question nobody asked.
              </span>
            </TooltipContent>
          </Tooltip>
          <Text as="span" size="xs" tone="quiet">
            A tooltip that only repeats the control&rsquo;s own name is announced twice — Radix wires
            it in as <code>aria-describedby</code>. The rail&rsquo;s tooltips carry the section
            subtitle for exactly this reason.
          </Text>
        </Row>
        <Row label="not for">
          <Text size="xs" tone="quiet">
            Anything a person needs in order to act. A tooltip does not exist on touch, cannot be
            selected, and disappears the moment the pointer moves — so a rule, a threshold or an
            error belongs on the page.
          </Text>
        </Row>
      </Case>

      <Case
        title="DropdownMenu"
        note="actions — not a value, and not arbitrary content"
        sources={[sources[1]]}
      >
        <Row label="menu">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm">Open a menu</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>run-119</DropdownMenuLabel>
              <DropdownMenuItem>Open the record</DropdownMenuItem>
              <DropdownMenuItem>Copy the correlation id</DropdownMenuItem>
              <DropdownMenuItem disabled>Re-run (no runner)</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem destructive>Withdraw this claim</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Text as="span" size="xs" tone="quiet">
            arrow keys move, Escape closes, and exactly one item is lit at a time — pointer and
            keyboard share <code>data-highlighted</code>, so there is never a second highlight
            behind the cursor.
          </Text>
        </Row>
        <Row label="not">
          <Text size="xs" tone="quiet">
            A <strong>Select</strong> holds a value and submits with a form; a{" "}
            <strong>Popover</strong> holds arbitrary content including inputs. All three look
            identical and are three different things to a screen reader — a menu announces its
            options as commands, and there is nothing for a form to submit.
          </Text>
        </Row>
      </Case>

      <Case
        title="Dialog"
        note="five obligations, four of them invisible until somebody without a mouse arrives"
        sources={[sources[2]]}
      >
        <Row label="centred">
          <Dialog>
            <DialogTrigger asChild><Button size="sm">Open a dialog</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Widen the scope?</DialogTitle>
                <DialogDescription>
                  A scope edit is the only action here that changes what a tool may touch. It is
                  shown as a draft with its consequences before it is saved.
                </DialogDescription>
              </DialogHeader>
              <DialogBody>
                <Text size="sm" tone="tertiary">
                  Tab is trapped inside this dialog, Escape closes it, and focus returns to the
                  button that opened it. The page behind is <code>aria-hidden</code>, so a screen
                  reader does not read through it.
                </Text>
              </DialogBody>
              <DialogFooter>
                <DialogClose asChild><Button size="sm" intent="ghost">Cancel</Button></DialogClose>
                <DialogClose asChild><Button size="sm" intent="primary">Save</Button></DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </Row>

        <Row label="edge sheet">
          <Dialog>
            <DialogTrigger asChild><Button size="sm">Open the record</Button></DialogTrigger>
            <DialogContent side="right">
              <DialogHeader>
                <DialogTitle>northbeam-cdn.example</DialogTitle>
                <DialogDescription>host · proposed · confidence 0.71</DialogDescription>
              </DialogHeader>
              <DialogBody>
                <Text size="sm" tone="tertiary">
                  The mock&rsquo;s record drawer is this, with a different anchor. Same focus trap,
                  same escape handling, same labelling — a separate Drawer component would duplicate
                  five obligations to change four CSS properties, and the duplicate is the one that
                  falls behind.
                </Text>
              </DialogBody>
            </DialogContent>
          </Dialog>
        </Row>
      </Case>

      <Case title="AlertDialog" note="the overlay does not dismiss it, and that is not styling">
        <Row label="interrupt">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" intent="danger">Discard the draft</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Discard this scope edit?</AlertDialogTitle>
                <AlertDialogDescription>
                  Two rules would be re-enabled and one asset would leave the surface. The
                  observations, lineage and judgement all stay — what changes is that nothing may
                  touch it again.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel asChild><Button size="sm" intent="ghost">Keep editing</Button></AlertDialogCancel>
                <AlertDialogAction asChild><Button size="sm" intent="danger">Discard</Button></AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Text as="span" size="xs" tone="quiet">
            Click the backdrop: nothing happens. Focus lands on <strong>Keep editing</strong>, not on
            the destructive action, and it is announced as <code>alertdialog</code>. A stray click
            that discards an unsaved edit is the bug this prevents.
          </Text>
        </Row>
      </Case>

      <Case title="Popover" note="arbitrary content, including things you can put a cursor in">
        <Row label="popover">
          <Popover>
            <PopoverTrigger asChild><Button size="sm">Filter assets</Button></PopoverTrigger>
            <PopoverContent>
              <Text size="sm" tone="secondary">
                A popover holds whatever a caller puts in it — inputs, a form, a small table. That is
                the difference from a menu: arrow keys do not move between these children, because
                they are not commands.
              </Text>
            </PopoverContent>
          </Popover>
          <Text as="span" size="xs" tone="quiet">
            Focus moves in, Escape closes, and a click outside dismisses. Unlike a dialog it does
            <strong> not</strong> trap focus or hide the page — a popover is beside the page, not
            over it.
          </Text>
        </Row>
      </Case>
    </Section>
  );
}
