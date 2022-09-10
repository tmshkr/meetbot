import Head from "next/head";
import { useRef, useState } from "react";
import axios from "axios";
import dynamic from "next/dynamic";
import prisma from "lib/prisma";
import Markdown from "marked-react";

const MarkdownEditor = dynamic(() => import("components/MarkdownEditor"), {
  ssr: false,
});

const buttonStyles =
  "inline-flex items-center rounded border border-transparent bg-indigo-600 px-2.5 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2";

export default function UserProfile(props) {
  const easyMDEref = useRef(null);
  const [isEditing, setIsEditing] = useState(false);
  const [user, setUser] = useState(props.user);
  const sumbitReadme = async () => {
    const { data } = await axios.put("/api/user/readme", {
      readme: easyMDEref.current.value(),
    });
    easyMDEref.current.toTextArea();
    setIsEditing(false);
    setUser({ ...user, ...data });
  };

  return (
    <div>
      <div className="flex">
        <img className="max-w-xs rounded-md" src={user.profile_image} />
        <div className="px-4">
          <h2 className="mt-0">{user.real_name}</h2>
          <p>meetings...</p>``
          <p>projects...</p>
        </div>
      </div>

      {isEditing ? (
        <>
          <MarkdownEditor easyMDEref={easyMDEref} />
          <button className={buttonStyles} onClick={sumbitReadme}>
            Submit
          </button>
        </>
      ) : (
        <>
          <Markdown>{user.readme}</Markdown>
          <button className={buttonStyles} onClick={() => setIsEditing(true)}>
            Edit README
          </button>
        </>
      )}
    </div>
  );
}

export async function getServerSideProps(context) {
  const { username } = context.params;
  const select = {
    id: true,
    profile_image: true,
    readme: true,
    real_name: true,
    username: true,
  };
  let user;

  if (Number(username)) {
    const id = Number(username);
    user = await prisma.user.findUnique({
      where: { id },
      select,
    });
  } else {
    user = await prisma.user.findUnique({
      where: { username },
      select,
    });
  }

  if (!user) {
    return {
      redirect: {
        destination: "/",
        permanent: false,
      },
    };
  }

  return {
    props: {
      user,
    },
  };
}
