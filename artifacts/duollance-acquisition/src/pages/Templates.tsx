export default function Templates() {
  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Message Templates Hub</h1>
        <p className="text-sm text-muted-foreground">Access and manage your outreach templates without leaving the portal.</p>
      </div>
      
      <div className="flex-1 rounded-xl overflow-hidden border border-border shadow-sm bg-card">
        <iframe 
          src="https://message-hub--fajar04nabila.replit.app" 
          className="w-full h-full border-0"
          title="Message Hub Templates"
        />
      </div>
    </div>
  );
}
