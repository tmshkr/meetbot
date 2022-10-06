import prisma from "common/prisma";
import { getHomeTab } from "app/views/home";
import { getInnerValues } from "utils/getInnerValues";

export const createProject = async ({ ack, body, view, client, logger }) => {
  await ack();

  const values = getInnerValues(view.state.values);
  const { new_project_title, team_members } = values;

  const projectCreator = await prisma.user.findUniqueOrThrow({
    where: {
      slack_id_slack_team_id: {
        slack_id: body.user.id,
        slack_team_id: body.user.team_id,
      },
    },
    select: { id: true },
  });

  const members: any = await prisma.user.findMany({
    where: {
      slack_id: {
        in: team_members.selected_conversations,
      },
    },
    select: { id: true, slack_id: true },
  });

  await prisma.project.create({
    data: {
      name: new_project_title.value,
      created_by_id: projectCreator.id,
      team_members: {
        create: members.map(({ id, slack_id }) => {
          if (slack_id === body.user.id) {
            return {
              user_id: id,
              role: "OWNER",
              added_by_id: projectCreator.id,
            };
          } else {
            return {
              user_id: id,
              added_by_id: projectCreator.id,
            };
          }
        }),
      },
    },
  });

  const home = await getHomeTab(body.user.id, body.user.team_id);
  await client.views.publish(home);

  for (const { slack_id } of members) {
    await client.chat.postMessage({
      channel: slack_id,
      text: `<@${body.user.id}> has added you to the ${new_project_title.value} team!`,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `<@${body.user.id}> has added you to the *${new_project_title.value}* team!`,
          },
        },
      ],
    });
  }
};
