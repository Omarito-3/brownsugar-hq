import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { auth } from "@/auth";
import { NoBranchAssigned } from "@/components/layout/no-branch-assigned";
import { getBranchScope } from "@/lib/permissions";
import { FadeIn } from "@/components/motion/fade-in";
import { TaskBoard } from "@/components/management/task-board";
import { MyTasksList } from "@/components/management/my-tasks-list";
import { DocumentsSection } from "@/components/management/documents-section";
import { getBranchesForUser, getAssignableUsers } from "@/lib/queries/shared";
import { getTasksForBoard, getMyTasks, getDocuments } from "@/lib/queries/management";

export default async function ManagementPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const t = await getTranslations("management");
  const isOwner = session.user.role === "OWNER";
  const isStaff = session.user.role === "STAFF";
  // Fails closed: a MANAGER/STAFF with no branch gets no branch-scoped data.
  const scope = getBranchScope(session.user);
  if (scope.kind === "none") return <NoBranchAssigned />;
  const scopedBranchId = scope.branchId;

  if (isStaff) {
    const myTasks = await getMyTasks(session.user.id);

    return (
      <div className="space-y-6">
        <FadeIn>
          <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>
        </FadeIn>
        <FadeIn delay={0.05}>
          <MyTasksList tasks={myTasks} />
        </FadeIn>
      </div>
    );
  }

  const [tasks, documents, branches, assignableUsers] = await Promise.all([
    getTasksForBoard(scopedBranchId),
    getDocuments(scopedBranchId),
    getBranchesForUser(scopedBranchId),
    getAssignableUsers(scopedBranchId),
  ]);

  return (
    <div className="space-y-8">
      <FadeIn>
        <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>
      </FadeIn>

      <FadeIn delay={0.05}>
        <TaskBoard
          tasks={tasks}
          branches={branches}
          assignableUsers={assignableUsers}
          isOwner={isOwner}
          defaultBranchId={scopedBranchId ?? ""}
        />
      </FadeIn>

      <FadeIn delay={0.1}>
        <DocumentsSection
          documents={documents}
          branches={branches}
          isOwner={isOwner}
          defaultBranchId={scopedBranchId ?? ""}
        />
      </FadeIn>
    </div>
  );
}
