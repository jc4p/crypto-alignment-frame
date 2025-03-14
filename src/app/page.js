import AlignmentChart from "@/components/AlignmentChart";

export const generateMetadata = async ({ searchParams }) => {
  const image  = (await searchParams).image

  const imageUrl = image
    ? `${process.env.R2_PUBLIC_URL}/onchain-analysis/${searchParams.image}`
    : `${process.env.R2_PUBLIC_URL}/onchain-analysis/default.png`;

  return {
    title: 'Onchain Alignment Chart',
    description: 'Discover where you align in the onchain ecosystem',
    other: {
      'fc:frame': JSON.stringify({
        version: "next",
        imageUrl: imageUrl,
        button: {
          title: "Analyze Your Profile",
          action: {
            type: "launch_frame",
            name: "Onchain Alignment Chart",
            url: process.env.NEXT_PUBLIC_BASE_URL,
            splashImageUrl: "https://images.kasra.codes/onchain-analysis/onchain-analysis-square-image.png",
            splashBackgroundColor: "#ffffff"
          }
        }
      })
    }
  };
};

export default function Page() {
  return <AlignmentChart />;
}
