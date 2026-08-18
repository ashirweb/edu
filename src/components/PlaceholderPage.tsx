const PlaceholderPage = ({ title }: { title: string }) => {
  return (
    <div className="space-y-6">
      <h1 className="page-title">{title}</h1>
      <div className="bg-card border border-border p-8 text-center">
        <p className="text-muted-foreground text-sm">
          This section is under development. Content will appear here.
        </p>
      </div>
    </div>
  );
};

export default PlaceholderPage;
