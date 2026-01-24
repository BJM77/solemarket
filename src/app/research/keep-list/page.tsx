'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, PlusCircle, List, Loader } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import type { Player } from '@/lib/research-types';
import { defaultPlayers } from '@/lib/research-types';

export default function KeepListPage() {
    const [players, setPlayers] = useState<Player[]>([]);
    const [newPlayerName, setNewPlayerName] = useState('');
    const [newPlayerSport, setNewPlayerSport] = useState<Player['sport']>('Uncategorized');
    const [isLoading, setIsLoading] = useState(true);
    const { user, isUserLoading } = useUser();
    const router = useRouter();
    const { toast } = useToast();

    useEffect(() => {
        if (!isUserLoading && !user) {
            router.push('/sign-in?redirect=/research/keep-list');
        }
    }, [user, isUserLoading, router]);

    useEffect(() => {
        if (user) {
            const storedNames = localStorage.getItem('namesToKeep');
            if (storedNames) {
                try {
                    const parsed = JSON.parse(storedNames);
                    setPlayers(Array.isArray(parsed) ? parsed : defaultPlayers);
                } catch {
                    setPlayers(defaultPlayers);
                }
            } else {
                setPlayers(defaultPlayers);
                localStorage.setItem('namesToKeep', JSON.stringify(defaultPlayers));
            }
            setIsLoading(false);
        }
    }, [user]);

    const handleAddPlayer = () => {
        if (!newPlayerName.trim()) {
            toast({ title: 'Enter a player name', variant: 'destructive' });
            return;
        }

        if (players.some(p => p.name.toLowerCase() === newPlayerName.toLowerCase())) {
            toast({ title: 'Player already in list', variant: 'destructive' });
            return;
        }

        const newPlayer: Player = { name: newPlayerName.trim(), sport: newPlayerSport };
        const updated = [...players, newPlayer].sort((a, b) => a.name.localeCompare(b.name));
        setPlayers(updated);
        localStorage.setItem('namesToKeep', JSON.stringify(updated));
        setNewPlayerName('');
        toast({ title: 'Player added!', description: `${newPlayer.name} added to keep list` });
    };

    const handleDeletePlayer = (name: string) => {
        const updated = players.filter(p => p.name !== name);
        setPlayers(updated);
        localStorage.setItem('namesToKeep', JSON.stringify(updated));
        toast({ title: 'Player removed' });
    };

    if (isUserLoading || isLoading || !user) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const sports = ['Baseball', 'Basketball', 'Football', 'Soccer', 'Hockey', 'Uncategorized'] as const;

    return (
        <div className="container mx-auto py-8 max-w-4xl">
            <PageHeader
                title="Keep List"
                description="Manage the players you want to keep when scanning cards"
            />

            <Card className="mt-8">
                <CardHeader>
                    <CardTitle>Add New Player</CardTitle>
                    <CardDescription>Add players to automatically detect keepers when scanning</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2">
                            <Label htmlFor="player-name">Player Name</Label>
                            <Input
                                id="player-name"
                                value={newPlayerName}
                                onChange={(e) => setNewPlayerName(e.target.value)}
                                placeholder="e.g., Stephen Curry"
                                onKeyDown={(e) => e.key === 'Enter' && handleAddPlayer()}
                            />
                        </div>
                        <div>
                            <Label htmlFor="sport">Sport</Label>
                            <Select value={newPlayerSport} onValueChange={(v) => setNewPlayerSport(v as Player['sport'])}>
                                <SelectTrigger id="sport">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {sports.map(sport => (
                                        <SelectItem key={sport} value={sport}>{sport}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <Button onClick={handleAddPlayer} className="mt-4">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Player
                    </Button>
                </CardContent>
            </Card>

            <Card className="mt-6">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Your Keep List ({players.length})</CardTitle>
                            <CardDescription>Players you're collecting</CardDescription>
                        </div>
                        <Button variant="outline" asChild>
                            <a href="/research">
                                <List className="mr-2 h-4 w-4" />
                                Back to Scanner
                            </a>
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {players.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">No players yet. Add some above!</p>
                    ) : (
                        <div className="space-y-2">
                            {players.map((player) => (
                                <div
                                    key={player.name}
                                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                                >
                                    <div>
                                        <p className="font-medium">{player.name}</p>
                                        <p className="text-sm text-muted-foreground">{player.sport}</p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDeletePlayer(player.name)}
                                        className="text-muted-foreground hover:text-destructive"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
