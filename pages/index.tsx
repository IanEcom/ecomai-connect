import type { GetServerSideProps } from "next";

export const getServerSideProps: GetServerSideProps = async (context) => {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(context.query)) {
    if (Array.isArray(value)) {
      value.forEach((entry) => {
        if (entry != null) params.append(key, entry);
      });
    } else if (value != null) {
      params.append(key, value);
    }
  }

  const search = params.toString();
  const destination = search ? `/admin?${search}` : "/admin";

  return {
    redirect: {
      destination,
      permanent: false,
    },
  };
};

export default function Index() {
  return null;
}
