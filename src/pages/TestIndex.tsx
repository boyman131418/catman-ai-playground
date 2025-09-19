const TestIndex = () => {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-primary">CatMan AI</h1>
        <p className="text-xl text-muted-foreground">專教人善用AI</p>
        <div className="w-24 h-24 bg-primary rounded-full mx-auto animate-pulse"></div>
        <p className="text-sm">網站運行正常！</p>
      </div>
    </div>
  );
};

export default TestIndex;