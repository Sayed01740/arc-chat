import React from 'react';

const contacts = [
    // Demo contacts - in a real app, these would come from the blockchain or local storage
    { id: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', name: 'Alice (Demo)', last: 'Hey — how are you?', unread: 2 },
    { id: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC', name: 'Bob (Demo)', last: 'Sent a photo', unread: 0 },
];

// Helper to shorten wallet addresses
function short(addr: string) {
    if (!addr) return '';
    return addr.substring(0, 6) + '...' + addr.substring(addr.length - 4);
}

export default function Sidebar({ wallet, onSelect }: { wallet: string; onSelect: (id: string) => void }) {
    return (
        <aside className="w-80 bg-white border-r border-gray-200 flex flex-col">
            <div className="p-4 flex items-center justify-between border-b border-gray-100 bg-gray-50">
                <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Signed in as</div>
                    <div className="font-bold text-gray-800 text-sm" title={wallet}>{short(wallet)}</div>
                </div>
                <button className="text-sm px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors shadow-sm">
                    + New
                </button>
            </div>

            <div className="p-3 flex-1 overflow-y-auto">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3 pl-2">Messages</div>
                <ul className="space-y-1">
                    {contacts.map(c => (
                        <li
                            key={c.id}
                            onClick={() => onSelect(c.id)}
                            className="p-3 rounded-lg hover:bg-gray-100 cursor-pointer flex justify-between items-center transition-colors group"
                        >
                            <div>
                                <div className="font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">{c.name}</div>
                                <div className="text-sm text-gray-500 truncate w-40">{c.last}</div>
                            </div>
                            {c.unread > 0 && (
                                <div className="bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-sm">
                                    {c.unread}
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            </div>
        </aside>
    );
}
