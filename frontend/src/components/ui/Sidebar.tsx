import React, { useState, useRef, useEffect } from 'react';

import { Contact } from '../../types';

// Helper to shorten wallet addresses
function short(addr: string) {
    if (!addr) return '';
    return addr.substring(0, 6) + '...' + addr.substring(addr.length - 4);
}

interface SidebarProps {
    wallet: string;
    contacts: Contact[];
    onSelect: (id: string) => void;
    onNew: () => void;
    onLogout: () => void;
    onView: (view: 'dashboard' | 'chat') => void;
}

export default function Sidebar({ wallet, contacts, onSelect, onNew, onLogout, onView }: SidebarProps) {
    const [search, setSearch] = useState('');
    const [avatar, setAvatar] = useState<string | null>(localStorage.getItem('userAvatar'));
    const [showAvatarMenu, setShowAvatarMenu] = useState(false);
    const [isDark, setIsDark] = useState(document.documentElement.classList.contains('dark'));
    const fileInputRef = useRef<HTMLInputElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    const toggleTheme = (e: React.MouseEvent) => {
        e.stopPropagation();
        const current = document.documentElement.classList.contains('dark');
        if (current) {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
            setIsDark(false);
        } else {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
            setIsDark(true);
        }
    };

    const filtered = contacts.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.id.toLowerCase().includes(search.toLowerCase()));

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowAvatarMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                localStorage.setItem('userAvatar', result);
                setAvatar(result);
                setShowAvatarMenu(false);
            };
            reader.readAsDataURL(file);
        }
    };

    const selectDefault = (seed: string) => {
        const url = `https://api.dicebear.com/7.x/notionists/svg?seed=${seed}`;
        localStorage.setItem('userAvatar', url);
        setAvatar(url);
        setShowAvatarMenu(false);
    };

    const avatarSrc = avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${wallet}`;

    return (
        <aside className="w-80 bg-sidebar border-r border-sidebar-border flex flex-col h-full shrink-0">
            {/* User Profile Header */}
            <div className="p-4 border-b border-sidebar-border bg-sidebar flex items-center justify-between shadow-sm z-10 cursor-pointer hover:bg-sidebar-accent transition-colors" onClick={() => onView('dashboard')}>
                <div className="flex items-center gap-3 relative" ref={menuRef}>
                    <div
                        className="relative group cursor-pointer"
                        onClick={(e) => { e.stopPropagation(); setShowAvatarMenu(!showAvatarMenu); }}
                    >
                        <img
                            src={avatarSrc}
                            alt="Avatar"
                            className="w-10 h-10 rounded-full bg-sidebar-accent border border-sidebar-border object-cover"
                        />
                        <div className="absolute inset-0 bg-black/30 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-white">
                                <path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z" />
                                <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0010 3H4.75A2.75 2.75 0 002 5.75v9.5A2.75 2.75 0 004.75 18h9.5A2.75 2.75 0 0017 15.25V10a.75.75 0 00-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z" />
                            </svg>
                        </div>
                    </div>

                    {/* Avatar Selection Menu */}
                    {showAvatarMenu && (
                        <div className="absolute top-12 left-0 w-48 bg-popover rounded-xl shadow-xl border border-border z-50 p-2 animate-in fade-in zoom-in-95 duration-100" onClick={e => e.stopPropagation()}>
                            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 px-2">Change Avatar</div>

                            <div className="grid grid-cols-4 gap-2 mb-3 px-1">
                                {['Felix', 'Aneka', 'Mark', 'Sasha'].map((seed) => (
                                    <button
                                        key={seed}
                                        onClick={() => selectDefault(seed)}
                                        className="w-8 h-8 rounded-full overflow-hidden hover:ring-2 ring-primary transition-all"
                                    >
                                        <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${seed}`} alt={seed} />
                                    </button>
                                ))}
                            </div>

                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleFileUpload}
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full text-left px-3 py-2 text-xs font-medium text-foreground hover:bg-muted rounded-lg flex items-center gap-2 transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                                    <path fillRule="evenodd" d="M1 5.25A2.25 2.25 0 013.25 3h13.5A2.25 2.25 0 0119 5.25v9.5A2.25 2.25 0 0116.75 17H3.25A2.25 2.25 0 011 14.75v-9.5zm4.026 4.265a.75.75 0 00-1.052 1.07l2.1 2.062a.75.75 0 001.052 0l2.1-2.062a.75.75 0 00-1.052-1.07l-1.324 1.3-1.324-1.3z" clipRule="evenodd" />
                                </svg>
                                Upload Image
                            </button>
                        </div>
                    )}
                    <div>
                        <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">My Wallet</div>
                        <div className="font-bold text-sidebar-foreground text-sm font-mono" title={wallet}>{short(wallet)}</div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={toggleTheme}
                        className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
                        title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
                    >
                        {isDark ? (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h1a1 1 0 100 2h-1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                            </svg>
                        )}
                    </button>
                    <div className="bg-emerald-100 p-1.5 rounded-full text-emerald-600">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                            <path fillRule="evenodd" d="M9.293 2.293a1 1 0 011.414 0l7 7A1 1 0 0117 11h-1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-3a1 1 0 00-1-1H9a1 1 0 00-1 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-6H3a1 1 0 01-.707-1.707l7-7z" clipRule="evenodd" />
                        </svg>
                    </div>
                </div>
            </div>

            {/* Search & Actions */}
            <div className="p-4 space-y-3">
                <button
                    onClick={onNew}
                    className="w-full py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-medium shadow-md shadow-primary/20 transition-all flex items-center justify-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                        <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                    </svg>
                    New Chat
                </button>
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search contacts..."
                        className="w-full pl-9 pr-4 py-2 bg-sidebar-accent border border-sidebar-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sidebar-ring focus:border-transparent transition-all placeholder:text-muted-foreground"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5">
                        <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
                    </svg>
                </div>
            </div>

            {/* Contacts List */}
            <div className="flex-1 overflow-y-auto px-2 pb-2 scrollbar-thin">
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-4 mb-2 mt-2">Recent</div>

                {contacts.length === 0 && (
                    <div className="text-center text-muted-foreground text-sm mt-10 px-6">
                        <div className="mb-2 text-2xl">👋</div>
                        No contacts yet.<br />Start a new chat to begin.
                    </div>
                )}

                <ul className="space-y-1">
                    {filtered.map(c => (
                        <li
                            key={c.id}
                            onClick={() => onSelect(c.id)}
                            className="p-3 rounded-xl hover:bg-sidebar-accent hover:shadow-sm cursor-pointer flex gap-3 items-center transition-all group border border-transparent hover:border-sidebar-border"
                        >
                            <img
                                src={`https://api.dicebear.com/7.x/identicon/svg?seed=${c.id}`}
                                alt={c.name}
                                className="w-10 h-10 rounded-full bg-sidebar-accent border border-sidebar-border group-hover:border-sidebar-primary transition-colors"
                            />
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-baseline">
                                    <div className="font-semibold text-sidebar-foreground truncate group-hover:text-sidebar-primary transition-colors">{c.name}</div>
                                    <div className="text-[10px] text-muted-foreground font-medium whitespace-nowrap ml-2">12:30</div>
                                </div>
                                <div className="flex justify-between items-center mt-0.5">
                                    <div className="text-sm text-sidebar-foreground/70 truncate pr-2">{c.last || 'No messages yet'}</div>
                                    {(c.unread || 0) > 0 && (
                                        <div className="bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center shadow-sm shadow-primary/20">
                                            {c.unread}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Logout Footer (Fixed) */}
            <div className="p-4 bg-sidebar border-t border-sidebar-border shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10">
                <button
                    onClick={onLogout}
                    aria-label="Disconnect Wallet"
                    className="w-full flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 py-2.5 rounded-lg transition-all border border-transparent hover:border-destructive/20 focus:outline-none focus:ring-2 focus:ring-destructive/20"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                    </svg>
                    Disconnect Wallet
                </button>

                <a
                    href="https://faucet.circle.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 py-2 rounded-lg transition-all mb-1 mt-2 border border-emerald-200"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 00-1.5 0v2.5h-2.5a.75.75 0 000 1.5h2.5v2.5a.75.75 0 001.5 0v-2.5h2.5a.75.75 0 000-1.5h-2.5v-2.5z" clipRule="evenodd" />
                    </svg>
                    Claim Faucet
                </a>
                <div className="flex flex-col items-center justify-center mt-4 gap-3">
                    <img src="/logo.png" alt="ARCchat" className="h-12 w-auto opacity-80 hover:opacity-100 transition-opacity" />
                    <div className="text-xs text-muted-foreground font-medium">v1.1.0</div>
                </div>
            </div>
        </aside>
    );
}
