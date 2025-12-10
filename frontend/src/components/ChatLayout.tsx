import React, { useState } from 'react';
import Sidebar from './ui/Sidebar';
import Conversation from './ui/Conversation';

export default function ChatLayout({ wallet, token }: { wallet: string; token: string }) {
    const [active, setActive] = useState<string | null>(null);

    // For the demo, we interpret the 'active' ID as the recipient's wallet address
    // If no contact is selected, we show a placeholder.

    return (
        <div className="h-screen flex bg-gray-100 font-sans">
            <Sidebar wallet={wallet} onSelect={(id) => setActive(id)} />
            <div className="flex-1 flex flex-col">
                {active ? (
                    <Conversation conversationId={active} wallet={wallet} />
                ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-400 bg-white">
                        <div className="text-center">
                            <h3 className="text-xl font-semibold text-gray-700">Welcome to Blockchain Chat</h3>
                            <p className="mt-2 text-sm">Select a conversation or start a new encrypted chat.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
