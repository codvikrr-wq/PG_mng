"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrg } from "@/context/org-context";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  BedDouble,
  Plus,
  Loader2,
  Pencil,
  Trash2,
  DoorOpen,
} from "lucide-react";
import { ROOM_TYPES, BED_STATUS } from "@/lib/constants";

export default function RoomsPage() {
  const { organization, currentPg, pgs } = useOrg();
  const supabase = createClient();

  const [rooms, setRooms] = useState([]);
  const [beds, setBeds] = useState({});
  const [loading, setLoading] = useState(true);
  const [roomDialogOpen, setRoomDialogOpen] = useState(false);
  const [bedDialogOpen, setBedDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [selectedRoomForBed, setSelectedRoomForBed] = useState(null);
  const [deleteRoom, setDeleteRoom] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Room form
  const [roomName, setRoomName] = useState("");
  const [roomType, setRoomType] = useState("Single");
  const [roomFloor, setRoomFloor] = useState("");
  const [roomCapacity, setRoomCapacity] = useState("1");
  const [roomRent, setRoomRent] = useState("");
  const [roomPgId, setRoomPgId] = useState("");

  // Bed form
  const [bedNumber, setBedNumber] = useState("");

  const loadData = useCallback(async () => {
    if (!organization) return;
    try {
      let query = supabase
        .from("rooms")
        .select("*")
        .eq("organization_id", organization.id)
        .order("name");

      if (currentPg) {
        query = query.eq("pg_id", currentPg.id);
      }

      const { data: roomData } = await query;
      setRooms(roomData || []);

      // Load beds grouped by room
      if (roomData && roomData.length > 0) {
        const roomIds = roomData.map((r) => r.id);
        const { data: bedData } = await supabase
          .from("beds")
          .select("*")
          .in("room_id", roomIds)
          .order("bed_number");

        const grouped = {};
        (bedData || []).forEach((b) => {
          if (!grouped[b.room_id]) grouped[b.room_id] = [];
          grouped[b.room_id].push(b);
        });
        setBeds(grouped);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [organization, currentPg]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function openCreateRoom() {
    setEditingRoom(null);
    setRoomName("");
    setRoomType("Single");
    setRoomFloor("");
    setRoomCapacity("1");
    setRoomRent("");
    setRoomPgId(currentPg?.id || pgs[0]?.id || "");
    setRoomDialogOpen(true);
  }

  function openEditRoom(room) {
    setEditingRoom(room);
    setRoomName(room.name);
    setRoomType(room.room_type);
    setRoomFloor(room.floor || "");
    setRoomCapacity(room.capacity?.toString() || "1");
    setRoomRent(room.monthly_rent?.toString() || "");
    setRoomPgId(room.pg_id);
    setRoomDialogOpen(true);
  }

  async function handleSaveRoom() {
    if (!roomName.trim()) {
      toast.error("Room name is required");
      return;
    }
    setCreating(true);
    try {
      const payload = {
        organization_id: organization.id,
        pg_id: roomPgId,
        name: roomName,
        room_type: roomType,
        floor: roomFloor || null,
        capacity: parseInt(roomCapacity) || 1,
        monthly_rent: parseFloat(roomRent) || 0,
      };

      if (editingRoom) {
        const { data, error } = await supabase
          .from("rooms")
          .update(payload)
          .eq("id", editingRoom.id)
          .select()
          .single();
        if (error) throw error;
        setRooms((prev) => prev.map((r) => (r.id === data.id ? data : r)));
        toast.success("Room updated");
      } else {
        const { data, error } = await supabase
          .from("rooms")
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        setRooms((prev) => [...prev, data]);

        // Auto-create beds based on capacity
        const cap = parseInt(roomCapacity) || 1;
        const bedInserts = [];
        for (let i = 1; i <= cap; i++) {
          bedInserts.push({
            room_id: data.id,
            pg_id: roomPgId,
            organization_id: organization.id,
            bed_number: `${roomName}-B${i}`,
          });
        }
        if (bedInserts.length > 0) {
          const { data: newBeds } = await supabase
            .from("beds")
            .insert(bedInserts)
            .select();
          if (newBeds) {
            setBeds((prev) => ({ ...prev, [data.id]: newBeds }));
          }
        }
        toast.success(`Room created with ${cap} bed(s)`);
      }
      setRoomDialogOpen(false);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteRoom() {
    if (!deleteRoom) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("rooms")
        .delete()
        .eq("id", deleteRoom.id);
      if (error) throw error;
      setRooms((prev) => prev.filter((r) => r.id !== deleteRoom.id));
      setBeds((prev) => {
        const copy = { ...prev };
        delete copy[deleteRoom.id];
        return copy;
      });
      setDeleteRoom(null);
      toast.success("Room deleted");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setDeleting(false);
    }
  }

  async function handleAddBed() {
    if (!bedNumber.trim() || !selectedRoomForBed) return;
    setCreating(true);
    try {
      const { data, error } = await supabase
        .from("beds")
        .insert({
          room_id: selectedRoomForBed.id,
          pg_id: selectedRoomForBed.pg_id,
          organization_id: organization.id,
          bed_number: bedNumber,
        })
        .select()
        .single();
      if (error) throw error;

      setBeds((prev) => ({
        ...prev,
        [selectedRoomForBed.id]: [
          ...(prev[selectedRoomForBed.id] || []),
          data,
        ],
      }));
      setBedDialogOpen(false);
      setBedNumber("");
      toast.success("Bed added");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setCreating(false);
    }
  }

  const statusColor = {
    available: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    occupied: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    maintenance: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rooms & Beds"
        description={`${rooms.length} rooms across ${currentPg ? currentPg.name : "all PGs"}`}
        action={
          <Button onClick={openCreateRoom}>
            <Plus className="mr-2 h-4 w-4" />
            Add Room
          </Button>
        }
      />

      {rooms.length === 0 ? (
        <EmptyState
          icon={DoorOpen}
          title="No rooms yet"
          description="Add rooms and beds to start managing your property"
          action={
            <Button onClick={openCreateRoom}>
              <Plus className="mr-2 h-4 w-4" />
              Add Room
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {rooms.map((room) => {
            const roomBeds = beds[room.id] || [];
            const occupiedCount = roomBeds.filter(
              (b) => b.status === "occupied"
            ).length;
            return (
              <Card key={room.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-base">{room.name}</CardTitle>
                      <Badge variant="outline">{room.room_type}</Badge>
                      {room.floor && (
                        <span className="text-xs text-muted-foreground">
                          Floor {room.floor}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {occupiedCount}/{roomBeds.length} occupied
                      </span>
                      {room.monthly_rent > 0 && (
                        <Badge>₹{room.monthly_rent.toLocaleString()}/mo</Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditRoom(room)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteRoom(room)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {roomBeds.map((bed) => (
                      <div
                        key={bed.id}
                        className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium ${statusColor[bed.status]}`}
                      >
                        <BedDouble className="h-3 w-3" />
                        {bed.bed_number}
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        setSelectedRoomForBed(room);
                        setBedNumber(`${room.name}-B${roomBeds.length + 1}`);
                        setBedDialogOpen(true);
                      }}
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      Add Bed
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Room dialog */}
      <Dialog open={roomDialogOpen} onOpenChange={setRoomDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingRoom ? "Edit Room" : "Create Room"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {!currentPg && pgs.length > 1 && (
              <div className="space-y-2">
                <Label>PG</Label>
                <Select value={roomPgId} onValueChange={setRoomPgId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select PG" />
                  </SelectTrigger>
                  <SelectContent>
                    {pgs.map((pg) => (
                      <SelectItem key={pg.id} value={pg.id}>
                        {pg.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Room Name/Number</Label>
                <Input
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="Room 101"
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={roomType} onValueChange={setRoomType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROOM_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Floor</Label>
                <Input
                  value={roomFloor}
                  onChange={(e) => setRoomFloor(e.target.value)}
                  placeholder="1"
                />
              </div>
              <div className="space-y-2">
                <Label>Capacity</Label>
                <Input
                  type="number"
                  value={roomCapacity}
                  onChange={(e) => setRoomCapacity(e.target.value)}
                  min="1"
                />
              </div>
              <div className="space-y-2">
                <Label>Monthly Rent (₹)</Label>
                <Input
                  type="number"
                  value={roomRent}
                  onChange={(e) => setRoomRent(e.target.value)}
                  placeholder="5000"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRoomDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveRoom} disabled={creating}>
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingRoom ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bed dialog */}
      <Dialog open={bedDialogOpen} onOpenChange={setBedDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Add Bed to {selectedRoomForBed?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Bed Number/Label</Label>
              <Input
                value={bedNumber}
                onChange={(e) => setBedNumber(e.target.value)}
                placeholder="B1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBedDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleAddBed} disabled={creating}>
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Bed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteRoom}
        onOpenChange={() => setDeleteRoom(null)}
        title="Delete Room"
        description={`This will delete "${deleteRoom?.name}" and all its beds. This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDeleteRoom}
        loading={deleting}
      />
    </div>
  );
}
