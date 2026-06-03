import "./globals.css";

export default function RootLayout({ children }: {children: React.ReactNode}){
    return (
    
        <html lang="ja">
            
            <body>
                <p>これがlayout.tsxだ</p>
                {children}
            </body>
        </html>
    );
}