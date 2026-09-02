import { localUser } from "../../logic/types"
import type { User } from "../../logic/types"
import Link from "next/link"

const user:User[]=localUser;


export default function page(){

    return(
        <div>
            test
            <Link href={`/users/${user[0].id}`}>1</Link>
            <Link href={`/users/${user[1].id}`}>2</Link>
        </div>
    )
}