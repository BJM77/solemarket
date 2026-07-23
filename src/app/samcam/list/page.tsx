
"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, PlusCircle, Search, Trash2, X, Download, Upload } from "lucide-react";
import { Button } from "@/samcam/components/ui/button";
import { Input } from "@/samcam/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/samcam/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/samcam/components/ui/card";
import { Player, defaultPlayers } from "@/samcam/lib/players";
import { useToast } from "@/samcam/hooks/use-toast";
import { ScrollArea } from "@/samcam/components/ui/scroll-area";
import { Label } from "@/samcam/components/ui/label";

const sportCategories: Player['sport'][] = ["NBA", "NFL", "MLB", "NHL", "Soccer", "Pokemon", "WWE", "Uncategorized"];

export default function ListPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sportFilter, setSportFilter] = useState("all");
  
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerSport, setNewPlayerSport] = useState<Player['sport']>("Uncategorized");
  const importInputRef = useRef<HTMLInputElement>(null);

  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const storedPlayers = localStorage.getItem("namesToKeep");
    if (storedPlayers) {
      setPlayers(JSON.parse(storedPlayers));
    } else {
      setPlayers(defaultPlayers);
    }
  }, []);

  const savePlayers = (updatedPlayers: Player[]) => {
    const sortedPlayers = updatedPlayers.sort((a,b) => a.name.localeCompare(b.name));
    setPlayers(sortedPlayers);
    localStorage.setItem("namesToKeep", JSON.stringify(sortedPlayers));
  };
  
  const handleAddPlayer = () => {
    if (!newPlayerName.trim()) {
      toast({ variant: "destructive", title: "Player Name Required" });
      return;
    }
    const newPlayer: Player = { name: newPlayerName.trim(), sport: newPlayerSport };
    if (players.some(p => p.name.toLowerCase() === newPlayer.name.toLowerCase())) {
        toast({ variant: "destructive", title: "Player already exists" });
        return;
    }
    const updatedPlayers = [...players, newPlayer];
    savePlayers(updatedPlayers);
    toast({ title: "Player Added", description: `"${newPlayer.name}" has been added.`});
    setNewPlayerName("");
    setNewPlayerSport("Uncategorized");
  };

  const handleRemovePlayer = (playerName: string) => {
    const updatedPlayers = players.filter(p => p.name !== playerName);
    savePlayers(updatedPlayers);
    toast({ title: "Player Removed", description: `"${playerName}" has been removed.`});
  };

  const handleExport = () => {
    const headers = ["name", "sport", "prizmRookieYear"];
    const csvContent = [
      headers.join(","),
      ...players.map(p => [
        `"${p.name.replace(/"/g, '""')}"`,
        p.sport,
        p.prizmRookieYear || ''
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", "card_keeper_player_list.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadTemplate = () => {
    const headers = "name,sport,prizmRookieYear";
    const blob = new Blob([headers], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", "player_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const text = e.target?.result as string;
        try {
            const lines = text.split('\n').slice(1); // Skip header
            const newPlayers: Player[] = lines.map(line => {
                const [name, sport, prizmRookieYear] = line.split(',');
                if (!name || !sport) return null;
                const newPlayer: Player = {
                    name: name.replace(/"/g, '').trim(),
                    sport: sport.trim() as Player['sport'],
                };
                if (prizmRookieYear && !isNaN(parseInt(prizmRookieYear))) {
                    newPlayer.prizmRookieYear = parseInt(prizmRookieYear.trim());
                }
                return newPlayer;
            }).filter((p): p is Player => p !== null && p.name !== "");

            const existingPlayerNames = new Set(players.map(p => p.name.toLowerCase()));
            const uniqueNewPlayers = newPlayers.filter(p => !existingPlayerNames.has(p.name.toLowerCase()));
            
            const updatedPlayers = [...players, ...uniqueNewPlayers];
            savePlayers(updatedPlayers);

            toast({
                title: "Import Successful",
                description: `${uniqueNewPlayers.length} new player(s) added. ${newPlayers.length - uniqueNewPlayers.length} duplicate(s) were ignored.`,
            });
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Import Failed",
                description: "Please check the file format and try again."
            });
            console.error("Import error:", error);
        }
    };
    reader.readAsText(file);
    // Reset file input
    if (importInputRef.current) {
        importInputRef.current.value = "";
    }
  };


  const filteredPlayers = useMemo(() => {
    return players.filter(player => {
      const nameMatch = player.name.toLowerCase().includes(searchTerm.toLowerCase());
      const sportMatch = sportFilter === 'all' || player.sport === sportFilter;
      return nameMatch && sportMatch;
    });
  }, [players, searchTerm, sportFilter]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur-sm">
        <Button variant="outline" size="icon" onClick={() => router.push('/samcam')}>
            <ArrowLeft className="w-6 h-6" />
            <span className="sr-only">Back</span>
        </Button>
        <h1 className="text-2xl font-bold font-headline text-primary">Manage Keep List</h1>
        <div className="w-10"></div>
      </header>

      <main className="p-4 md:p-6 grid gap-6 md:grid-cols-3">
        <div className="md:col-span-1 flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Add New Player</CardTitle>
              <CardDescription>Manually add a single player to your keep list.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-player-name">Player Name</Label>
                <Input 
                  id="new-player-name"
                  placeholder="e.g. Michael Jordan"
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-player-sport">Sport</Label>
                 <Select value={newPlayerSport} onValueChange={(value) => setNewPlayerSport(value as Player['sport'])}>
                    <SelectTrigger id="new-player-sport">
                        <SelectValue placeholder="Select a sport" />
                    </SelectTrigger>
                    <SelectContent>
                        {sportCategories.map(sport => (
                            <SelectItem key={sport} value={sport}>{sport}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAddPlayer}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add to List
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
                <CardTitle>Bulk Management</CardTitle>
                <CardDescription>Import or export your entire player list.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
                <Button onClick={() => importInputRef.current?.click()} className="w-full">
                    <Upload className="mr-2 h-4 w-4" /> Import List from CSV
                </Button>
                <input type="file" ref={importInputRef} onChange={handleImport} className="hidden" accept=".csv" />
                <Button onClick={handleExport} variant="secondary" className="w-full">
                    <Download className="mr-2 h-4 w-4" /> Export List to CSV
                </Button>
                <Button onClick={handleDownloadTemplate} variant="link" className="w-full">
                    Download CSV Template
                </Button>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
          <Card>
            <CardHeader>
                <CardTitle>Your Keep List</CardTitle>
                <CardDescription>You have {players.length} players in your list.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4 mb-4">
                <div className="relative flex-grow">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input 
                    placeholder="Search your list..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && <X className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground cursor-pointer" onClick={() => setSearchTerm('')}/>}
                </div>
                 <Select value={sportFilter} onValueChange={setSportFilter}>
                    <SelectTrigger className="w-full md:w-[180px]">
                        <SelectValue placeholder="Filter by sport" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Sports</SelectItem>
                        {sportCategories.map(sport => (
                            <SelectItem key={sport} value={sport}>{sport}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
              </div>

              <ScrollArea className="h-[60vh] border rounded-md">
                <div className="p-1">
                    {filteredPlayers.length > 0 ? (
                        filteredPlayers.map(player => (
                            <div key={player.name} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-md">
                                <div>
                                    <p className="font-semibold">{player.name}</p>
                                    <p className="text-xs text-muted-foreground">{player.sport}</p>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => handleRemovePlayer(player.name)}>
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                    <span className="sr-only">Remove {player.name}</span>
                                </Button>
                            </div>
                        ))
                    ) : (
                        <div className="text-center p-8 text-muted-foreground">No players found.</div>
                    )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
