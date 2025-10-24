import ComingSoon from "../ComingSoon";

interface InspectionsComingSoonProps {
  title: string;
  moduleKey: "inspecciones";
  description?: string;
}

export default function InspectionsComingSoon({ title, moduleKey, description }: InspectionsComingSoonProps) {
  return (
    <ComingSoon
      title={title}
      moduleKey={moduleKey}
      description={
        description ??
        "Estamos diseñando este submódulo para cubrir todo el ciclo HSE conforme a ISO 45001, ISO 14001 y normativa chilena. Pronto podrás gestionarlo desde aquí."
      }
    />
  );
}
