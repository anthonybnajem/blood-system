import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
} from "@/components/ui/alert-dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarTrigger,
} from "@/components/ui/menubar";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { COMPONENT_CATALOG } from "../component-catalog";
import { ChartDemoClient } from "./ChartDemoClient";

type Params = {
  type: string;
};

export function generateStaticParams() {
  return COMPONENT_CATALOG.map((item) => ({ type: item.slug }));
}

function PreviewCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">{children}</CardContent>
    </Card>
  );
}

function renderDemo(type: string) {
  switch (type) {
    case "buttons":
      return (
        <PreviewCard title="Buttons">
          <div className="flex flex-wrap gap-2">
            <Button>Default</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
          </div>
        </PreviewCard>
      );

    case "cards":
      return (
        <div className="grid gap-4 md:grid-cols-2">
          <PreviewCard title="Metric Card">
            <p className="text-3xl font-semibold">1,245</p>
            <p className="text-sm text-muted-foreground">Sample value</p>
          </PreviewCard>
          <PreviewCard title="Info Card">
            <p className="text-sm text-muted-foreground">Responsive content container preview.</p>
          </PreviewCard>
        </div>
      );

    case "forms":
      return (
        <PreviewCard title="Form Controls">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input placeholder="John Doe" />
            </div>
            <div className="flex items-center gap-2 pt-7">
              <Switch id="demo-switch" defaultChecked />
              <label htmlFor="demo-switch" className="text-sm">Enable notifications</label>
            </div>
          </div>
        </PreviewCard>
      );

    case "feedback":
      return (
        <div className="space-y-4">
          <PreviewCard title="Badges">
            <div className="flex flex-wrap gap-2">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="destructive">Error</Badge>
              <Badge variant="outline">Outline</Badge>
            </div>
          </PreviewCard>
          <Alert>
            <AlertTitle>Heads up</AlertTitle>
            <AlertDescription>Feedback components adapt to any screen width.</AlertDescription>
          </Alert>
        </div>
      );

    case "tables":
      return (
        <PreviewCard title="Table">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Alice</TableCell>
                <TableCell>Admin</TableCell>
                <TableCell>Active</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Bob</TableCell>
                <TableCell>Editor</TableCell>
                <TableCell>Pending</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </PreviewCard>
      );

    case "accordion":
      return (
        <PreviewCard title="Accordion">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger>Section One</AccordionTrigger>
              <AccordionContent>Accordion content for section one.</AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger>Section Two</AccordionTrigger>
              <AccordionContent>Accordion content for section two.</AccordionContent>
            </AccordionItem>
          </Accordion>
        </PreviewCard>
      );

    case "alert-dialog":
      return (
        <PreviewCard title="Alert Dialog">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline">Open Alert Dialog</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirm action</AlertDialogTitle>
                <AlertDialogDescription>This is a responsive alert dialog preview.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction>Continue</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </PreviewCard>
      );

    case "avatar":
      return (
        <PreviewCard title="Avatar">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback>AD</AvatarFallback>
            </Avatar>
            <Avatar className="h-12 w-12">
              <AvatarFallback>UI</AvatarFallback>
            </Avatar>
          </div>
        </PreviewCard>
      );

    case "breadcrumb":
      return (
        <PreviewCard title="Breadcrumb">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem><BreadcrumbLink href="#">Home</BreadcrumbLink></BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem><BreadcrumbLink href="#">Components</BreadcrumbLink></BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem><BreadcrumbPage>Breadcrumb</BreadcrumbPage></BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </PreviewCard>
      );

    case "calendar":
      return (
        <PreviewCard title="Calendar">
          <div className="max-w-full overflow-x-auto"><Calendar mode="single" selected={new Date()} className="rounded-md border" /></div>
        </PreviewCard>
      );

    case "carousel":
      return (
        <PreviewCard title="Carousel">
          <Carousel className="w-full max-w-md mx-auto">
            <CarouselContent>
              {[1, 2, 3].map((n) => (
                <CarouselItem key={n}>
                  <div className="p-1">
                    <Card>
                      <CardContent className="flex aspect-[16/9] items-center justify-center">
                        Slide {n}
                      </CardContent>
                    </Card>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </PreviewCard>
      );

    case "chart":
      return (
        <PreviewCard title="Chart">
          <ChartDemoClient />
        </PreviewCard>
      );

    case "checkbox":
      return (
        <PreviewCard title="Checkbox">
          <div className="flex items-center gap-2">
            <Checkbox id="check" defaultChecked />
            <label htmlFor="check" className="text-sm">Accept terms</label>
          </div>
        </PreviewCard>
      );

    case "command":
      return (
        <PreviewCard title="Command">
          <Command className="rounded-lg border">
            <CommandInput placeholder="Search commands..." />
            <CommandList>
              <CommandEmpty>No result found.</CommandEmpty>
              <CommandGroup heading="Quick Actions">
                <CommandItem>New project</CommandItem>
                <CommandItem>Open settings</CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PreviewCard>
      );

    case "context-menu":
      return (
        <PreviewCard title="Context Menu">
          <ContextMenu>
            <ContextMenuTrigger className="flex h-24 w-full max-w-sm items-center justify-center rounded-xl border border-dashed text-sm">
              Right click here
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem>Edit</ContextMenuItem>
              <ContextMenuItem>Duplicate</ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        </PreviewCard>
      );

    case "dialog":
      return (
        <PreviewCard title="Dialog">
          <Dialog>
            <DialogTrigger asChild><Button variant="outline">Open Dialog</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Dialog preview</DialogTitle>
                <DialogDescription>Responsive modal content.</DialogDescription>
              </DialogHeader>
            </DialogContent>
          </Dialog>
        </PreviewCard>
      );

    case "drawer":
      return (
        <PreviewCard title="Drawer">
          <Drawer>
            <DrawerTrigger asChild><Button variant="outline">Open Drawer</Button></DrawerTrigger>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>Drawer preview</DrawerTitle>
                <DrawerDescription>Bottom drawer for mobile-friendly interactions.</DrawerDescription>
              </DrawerHeader>
              <DrawerFooter>
                <Button>Action</Button>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
        </PreviewCard>
      );

    case "dropdown-menu":
      return (
        <PreviewCard title="Dropdown Menu">
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="outline">Open Menu</Button></DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem>Settings</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </PreviewCard>
      );

    case "hover-card":
      return (
        <PreviewCard title="Hover Card">
          <HoverCard>
            <HoverCardTrigger asChild><Button variant="link">Hover me</Button></HoverCardTrigger>
            <HoverCardContent className="w-72">Quick preview content inside hover card.</HoverCardContent>
          </HoverCard>
        </PreviewCard>
      );

    case "input":
      return (
        <PreviewCard title="Input">
          <Input placeholder="Type here..." className="max-w-md" />
        </PreviewCard>
      );

    case "input-otp":
      return (
        <PreviewCard title="Input OTP">
          <InputOTP maxLength={6}>
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
            </InputOTPGroup>
            <InputOTPSeparator />
            <InputOTPGroup>
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </PreviewCard>
      );

    case "menubar":
      return (
        <PreviewCard title="Menubar">
          <Menubar className="w-full max-w-md">
            <MenubarMenu>
              <MenubarTrigger>File</MenubarTrigger>
              <MenubarContent>
                <MenubarItem>New</MenubarItem>
                <MenubarItem>Open</MenubarItem>
              </MenubarContent>
            </MenubarMenu>
            <MenubarMenu>
              <MenubarTrigger>Edit</MenubarTrigger>
              <MenubarContent>
                <MenubarItem>Undo</MenubarItem>
                <MenubarItem>Redo</MenubarItem>
              </MenubarContent>
            </MenubarMenu>
          </Menubar>
        </PreviewCard>
      );

    case "navigation-menu":
      return (
        <PreviewCard title="Navigation Menu">
          <div className="overflow-x-auto">
            <NavigationMenu>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuTrigger>Docs</NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[280px] gap-2 p-3">
                      <li>
                        <NavigationMenuLink asChild>
                          <Link href="#" className="block rounded-md p-2 hover:bg-accent">Getting Started</Link>
                        </NavigationMenuLink>
                      </li>
                      <li>
                        <NavigationMenuLink asChild>
                          <Link href="#" className="block rounded-md p-2 hover:bg-accent">Components</Link>
                        </NavigationMenuLink>
                      </li>
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          </div>
        </PreviewCard>
      );

    case "pagination":
      return (
        <PreviewCard title="Pagination">
          <Pagination>
            <PaginationContent>
              <PaginationItem><PaginationPrevious href="#" /></PaginationItem>
              <PaginationItem><PaginationLink href="#" isActive>1</PaginationLink></PaginationItem>
              <PaginationItem><PaginationLink href="#">2</PaginationLink></PaginationItem>
              <PaginationItem><PaginationNext href="#" /></PaginationItem>
            </PaginationContent>
          </Pagination>
        </PreviewCard>
      );

    case "popover":
      return (
        <PreviewCard title="Popover">
          <Popover>
            <PopoverTrigger asChild><Button variant="outline">Open Popover</Button></PopoverTrigger>
            <PopoverContent className="w-72">Popover content goes here.</PopoverContent>
          </Popover>
        </PreviewCard>
      );

    case "progress":
      return (
        <PreviewCard title="Progress">
          <Progress value={65} className="max-w-md" />
        </PreviewCard>
      );

    case "radio-group":
      return (
        <PreviewCard title="Radio Group">
          <RadioGroup defaultValue="a" className="gap-3">
            <div className="flex items-center gap-2">
              <RadioGroupItem value="a" id="a" />
              <label htmlFor="a" className="text-sm">Option A</label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="b" id="b" />
              <label htmlFor="b" className="text-sm">Option B</label>
            </div>
          </RadioGroup>
        </PreviewCard>
      );

    case "scroll-area":
      return (
        <PreviewCard title="Scroll Area">
          <ScrollArea className="h-36 w-full max-w-md rounded-md border p-3">
            <div className="space-y-2 text-sm">
              {Array.from({ length: 20 }).map((_, i) => (
                <p key={i}>Scrollable row {i + 1}</p>
              ))}
            </div>
          </ScrollArea>
        </PreviewCard>
      );

    case "sheet":
      return (
        <PreviewCard title="Sheet">
          <Sheet>
            <SheetTrigger asChild><Button variant="outline">Open Sheet</Button></SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Sheet panel</SheetTitle>
                <SheetDescription>Right-side panel content.</SheetDescription>
              </SheetHeader>
            </SheetContent>
          </Sheet>
        </PreviewCard>
      );

    case "sidebar":
      return (
        <PreviewCard title="Sidebar">
          <div className="h-64 overflow-hidden rounded-xl border">
            <SidebarProvider defaultOpen>
              <div className="flex h-full w-full">
                <Sidebar collapsible="none" className="relative h-full">
                  <SidebarContent>
                    <SidebarGroup>
                      <SidebarGroupLabel>Demo Menu</SidebarGroupLabel>
                      <SidebarGroupContent>
                        <SidebarMenu>
                          <SidebarMenuItem>
                            <SidebarMenuButton isActive>
                              <span>Dashboard</span>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                          <SidebarMenuItem>
                            <SidebarMenuButton>
                              <span>Components</span>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        </SidebarMenu>
                      </SidebarGroupContent>
                    </SidebarGroup>
                  </SidebarContent>
                </Sidebar>
                <SidebarInset className="min-h-0">
                  <div className="p-4 text-sm text-muted-foreground">Responsive content area.</div>
                </SidebarInset>
              </div>
            </SidebarProvider>
          </div>
        </PreviewCard>
      );

    case "skeleton":
      return (
        <PreviewCard title="Skeleton">
          <div className="space-y-3 max-w-md">
            <Skeleton className="h-4 w-[70%]" />
            <Skeleton className="h-4 w-[90%]" />
            <Skeleton className="h-24 w-full" />
          </div>
        </PreviewCard>
      );

    case "slider":
      return (
        <PreviewCard title="Slider">
          <Slider defaultValue={[40]} max={100} step={1} className="max-w-md" />
        </PreviewCard>
      );

    case "switch":
      return (
        <PreviewCard title="Switch">
          <div className="flex items-center gap-2">
            <Switch id="switch-demo" defaultChecked />
            <label htmlFor="switch-demo" className="text-sm">Enable setting</label>
          </div>
        </PreviewCard>
      );

    case "tabs":
      return (
        <PreviewCard title="Tabs">
          <Tabs defaultValue="overview" className="w-full max-w-md">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="text-sm text-muted-foreground">Overview content.</TabsContent>
            <TabsContent value="details" className="text-sm text-muted-foreground">Details content.</TabsContent>
          </Tabs>
        </PreviewCard>
      );

    case "textarea":
      return (
        <PreviewCard title="Textarea">
          <Textarea placeholder="Write your notes..." className="max-w-xl" />
        </PreviewCard>
      );

    case "toggle":
      return (
        <PreviewCard title="Toggle">
          <Toggle aria-label="Toggle italic">Toggle</Toggle>
        </PreviewCard>
      );

    case "toggle-group":
      return (
        <PreviewCard title="Toggle Group">
          <ToggleGroup type="single" defaultValue="left">
            <ToggleGroupItem value="left">Left</ToggleGroupItem>
            <ToggleGroupItem value="center">Center</ToggleGroupItem>
            <ToggleGroupItem value="right">Right</ToggleGroupItem>
          </ToggleGroup>
        </PreviewCard>
      );

    case "tooltip":
      return (
        <PreviewCard title="Tooltip">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild><Button variant="outline">Hover me</Button></TooltipTrigger>
              <TooltipContent>Tooltip content</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </PreviewCard>
      );

    default:
      return null;
  }
}

export default async function ComponentTypePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { type } = await params;
  const metadata = COMPONENT_CATALOG.find((item) => item.slug === type);

  if (!metadata) {
    notFound();
  }

  const demo = renderDemo(type);

  if (!demo) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{metadata.title}</h1>
        <p className="mt-1 text-muted-foreground">{metadata.description}</p>
      </div>

      {demo}
    </div>
  );
}
