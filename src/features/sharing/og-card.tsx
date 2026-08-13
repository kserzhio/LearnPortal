type SystemaOgCardProps = Readonly<{
  eyebrow: string;
  title: string;
  description: string;
  accent: string;
}>;

export function SystemaOgCard({ eyebrow, title, description, accent }: SystemaOgCardProps) {
  return (
    <div style={{ display:"flex", width:"100%", height:"100%", flexDirection:"column", justifyContent:"space-between", padding:"4rem", color:"#f7f6fb", background:"#151628" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"1rem", fontSize:"1.5rem", fontWeight:800, letterSpacing:"0.12em" }}>
          <span style={{ display:"flex", width:"3rem", height:"3rem", alignItems:"center", justifyContent:"center", color:"#151628", background:"#c4f750" }}>S</span>
          SYSTEMA
        </div>
        <div style={{ display:"flex", padding:"0.75rem 1rem", color:"#151628", background:"#c4f750", fontSize:"1.25rem", fontWeight:800 }}>{accent}</div>
      </div>
      <div style={{ display:"flex", maxWidth:"60rem", flexDirection:"column" }}>
        <div style={{ display:"flex", color:"#b9b2ff", fontSize:"1.25rem", fontWeight:800, letterSpacing:"0.1em" }}>{eyebrow}</div>
        <div style={{ display:"flex", marginTop:"1rem", fontSize:"4rem", fontWeight:800, lineHeight:1.02, letterSpacing:"-0.04em" }}>{title}</div>
        <div style={{ display:"flex", maxWidth:"52rem", marginTop:"1.5rem", color:"#d7d8e2", fontSize:"1.6rem", lineHeight:1.4 }}>{description}</div>
      </div>
      <div style={{ display:"flex", color:"#c4f750", fontSize:"1.25rem", fontWeight:700 }}>Learn → Build → Simulate → Check</div>
    </div>
  );
}
