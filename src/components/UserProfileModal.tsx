type Props={
    open: boolean;
    onClose: () => void;
}

export default function UserProfileModal({ open, onClose}: Props){
    if (!open) return null;

    return(
           <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm grid place-items-center p-4 overflow-y-auto"
            onMouseDown={(e) => {
                // 背景クリックで閉じる
                if (e.target === e.currentTarget) onClose();
            }}
            >
                <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 p-6 space-y-6 my-8">
                    modal
                </div>
                
            </div>
    );
}